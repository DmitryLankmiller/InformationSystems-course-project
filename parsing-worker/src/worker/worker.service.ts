import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { ParsingJobMessage, SortType } from '../utils/types';
import { WildberriesHandler } from './handlers/wildberries/wildberries.handler';
import { WebsiteHandler } from './handlers/website-handler';
import { withRetry } from '../utils/utils';

type DoneStatus = 'done' | 'error';

@Injectable()
export class WorkerService implements OnModuleInit {
	private readonly logger = new Logger(WorkerService.name);

	private readonly LINKS_TOPIC =
		process.env.LINKS_TOPIC || 'parsing-links-collected';
	private readonly FEEDBACKS_TOPIC =
		process.env.FEEDBACKS_TOPIC || 'parsing-feedbacks';
	private readonly PARSING_DONE_TOPIC =
		process.env.PARSING_DONE_TOPIC || 'parsing-done';
	private readonly PARSING_FAILED_TOPIC =
		process.env.PARSING_FAILED_TOPIC || 'parsing-failed';

	private readonly DEFAULT_ITEMS_LIMIT = Number(
		process.env.DEFAULT_ITEMS_LIMIT || 10,
	);
	private readonly DEFAULT_FEEDBACKS_PER_ITEM_LIMIT = Number(
		process.env.DEFAULT_FEEDBACKS_PER_ITEM_LIMIT || 200,
	);

	private readonly RETRY_ATTEMPTS = Number(
		process.env.PARSING_RETRY_ATTEMPTS || 3,
	);
	private readonly RETRY_DELAY_MS = Number(
		process.env.PARSING_RETRY_DELAY_MS || 400,
	);

	private readonly DEDUP_TTL_MS = Number(
		process.env.DEDUP_TTL_MS || 10 * 60 * 1000,
	);

	private readonly processed = new Map<string, number>();

	constructor(
		@Inject('KAFKA_CLIENT') private readonly kafkaClient: ClientKafka,
		private readonly wildberriesHandler: WildberriesHandler,
	) {}

	async onModuleInit() {
		try {
			await this.kafkaClient.connect();
			this.logger.log('ClientKafka connected');
		} catch (e) {
			this.logger.warn('ClientKafka connect failed: ' + (e as Error).message);
		}
	}

	async processJob(msg: ParsingJobMessage) {
		if (!msg || !(msg as any).type) {
			this.logger.warn('Invalid job message');
			return { ok: false };
		}

		const jobId = (msg as any).jobId as number;
		const type = (msg as any).type as string;

		if (this.isDuplicate(jobId, type)) {
			this.logger.warn(`skip duplicate jobId=${jobId} type=${type}`);
			return { ok: true, skipped: true };
		}

		const website = ((msg as any).website || 'wildberries') as string;
		const handler = this.getHandler(website);

		if (!handler) {
			this.emitParsingDone(
				jobId,
				'error',
				`NotSupported website: ${website}`,
				0,
				0,
			);
			return { ok: false, reason: 'not_supported' };
		}

		try {
			if (msg.type === 'collect_links') {
				await this.processCollectLinks(handler, msg);
			} else if (msg.type === 'parse_links') {
				await this.processParseLinks(handler, msg);
			} else {
				this.logger.warn('Unknown job type: ' + JSON.stringify(msg));
			}
			return { ok: true };
		} catch (e) {
			const errMsg = (e as Error)?.message || String(e);

			this.emitFailure({
				jobId,
				website,
				stage: 'job',
				url: null,
				attempt: this.RETRY_ATTEMPTS,
				error: errMsg,
			});

			this.emitParsingDone(jobId, 'error', errMsg, 0, 0);
			return { ok: false, reason: 'error' };
		}
	}

	private isDuplicate(jobId: number, type: string) {
		const key = `${jobId}:${type}`;
		const now = Date.now();

		for (const [k, ts] of this.processed.entries()) {
			if (now - ts > this.DEDUP_TTL_MS) this.processed.delete(k);
		}

		if (this.processed.has(key)) return true;

		this.processed.set(key, now);
		return false;
	}

	private getHandler(website: string): WebsiteHandler | null {
		switch (website) {
			case 'wildberries':
				return this.wildberriesHandler;
			default:
				return null;
		}
	}

	private async processCollectLinks(
		handler: WebsiteHandler,
		msg: Extract<ParsingJobMessage, { type: 'collect_links' }>,
	) {
		const jobId = msg.jobId;

		const itemsLimit =
			msg.itemsLimit && msg.itemsLimit > 0
				? msg.itemsLimit
				: this.DEFAULT_ITEMS_LIMIT;
		const itemsSortType = (msg.itemsSortType ?? null) as SortType | null;

		this.logger.log(
			`collect_links jobId=${jobId} website=${(handler as any).website} q="${msg.searchInput}" limit=${itemsLimit}`,
		);

		const links = await withRetry(
			() =>
				handler.collectLinks({
					jobId,
					searchInput: msg.searchInput,
					itemsLimit,
					itemsSortType,
				}),
			{
				attempts: this.RETRY_ATTEMPTS,
				delayMs: this.RETRY_DELAY_MS,
				onError: (e, attempt) => {
					this.logger.warn(
						`collect_links retry attempt=${attempt} jobId=${jobId} err=${(e as Error).message}`,
					);
				},
			},
		);

		const payload = {
			jobId,
			website: (handler as any).website,
			links,
			feedbacksPerItemLimit: msg.feedbacksPerItemLimit ?? null,
			feedbacksSortType: msg.feedbacksSortType ?? null,
		};

		this.kafkaClient.emit(this.LINKS_TOPIC, payload);

		this.logger.log(`collect_links done jobId=${jobId} links=${links.length}`);
	}

	private async processParseLinks(
		handler: WebsiteHandler,
		msg: Extract<ParsingJobMessage, { type: 'parse_links' }>,
	) {
		const jobId = msg.jobId;

		const perItem =
			msg.feedbacksPerItemLimit && msg.feedbacksPerItemLimit > 0
				? msg.feedbacksPerItemLimit
				: this.DEFAULT_FEEDBACKS_PER_ITEM_LIMIT;

		const feedbacksSortType = (msg.feedbacksSortType ??
			null) as SortType | null;

		const links = msg.links || [];
		if (links.length === 0) {
			this.emitParsingDone(jobId, 'done', null, 0, 0);
			return;
		}

		this.logger.log(
			`parse_links jobId=${jobId} website=${(handler as any).website} links=${links.length} perItem=${perItem}`,
		);

		let totalFeedbacks = 0;
		let failedLinks = 0;

		for (const url of links) {
			try {
				const messages = await withRetry(
					() =>
						handler.parseLink({
							jobId,
							url,
							feedbacksPerItemLimit: perItem,
							feedbacksSortType,
						}),
					{
						attempts: this.RETRY_ATTEMPTS,
						delayMs: this.RETRY_DELAY_MS,
						onError: (e, attempt) => {
							this.logger.warn(
								`parse_link retry attempt=${attempt} jobId=${jobId} url=${url} err=${(e as Error).message}`,
							);
						},
					},
				);

				for (const m of messages) {
					this.kafkaClient.emit(this.FEEDBACKS_TOPIC, {
						key: String(jobId),
						value: m,
					});
					totalFeedbacks++;
				}
			} catch (e) {
				failedLinks++;
				const errMsg = (e as Error)?.message || String(e);

				this.emitFailure({
					jobId,
					website: (handler as any).website,
					stage: 'parse_link',
					url,
					attempt: this.RETRY_ATTEMPTS,
					error: errMsg,
				});

				this.logger.error(
					`parse_link failed jobId=${jobId} url=${url} err=${errMsg}`,
				);
			}
		}

		if (failedLinks > 0) {
			this.emitParsingDone(
				jobId,
				'error',
				`Failed links: ${failedLinks}/${links.length}`,
				links.length,
				totalFeedbacks,
			);
			return;
		}

		this.emitParsingDone(jobId, 'done', null, links.length, totalFeedbacks);
	}

	private emitParsingDone(
		jobId: number,
		status: DoneStatus,
		message: string | null,
		totalLinks: number,
		totalFeedbacks: number,
	) {
		try {
			this.kafkaClient.emit(this.PARSING_DONE_TOPIC, {
				jobId,
				status,
				message,
				totalLinks,
				totalFeedbacks,
				finishedAt: new Date().toISOString(),
			});
		} catch (e) {
			this.logger.warn('Failed to emit parsing-done: ' + (e as Error).message);
		}
	}

	private emitFailure(payload: {
		jobId: number;
		website: string;
		stage: 'job' | 'collect_links' | 'parse_link';
		url: string | null;
		attempt: number;
		error: string;
	}) {
		try {
			this.kafkaClient.emit(this.PARSING_FAILED_TOPIC, {
				...payload,
				at: new Date().toISOString(),
			});
		} catch (e) {
			this.logger.warn(
				'Failed to emit parsing-failed: ' + (e as Error).message,
			);
		}
	}
}
