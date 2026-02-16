import {
	extractImtIdFromUrl,
	extractItemIdFromUrl,
	fetchFeedbacksPage as fetchFeedbacks,
} from './wb-api';
import { randomUUID } from 'crypto';
import {
	CollectLinksInput,
	KafkaFeedbackMessage,
	ParseLinkInput,
	WebsiteHandler,
} from '../website-handler';
import { Logger } from '@nestjs/common';
import { PlaywrightCrawler } from 'crawlee';
import { BASE_URL, MainPage } from '../../../pages/main.page';
import { ItemPage } from '../../../pages/item.page';

export class WildberriesHandler implements WebsiteHandler {
	private readonly logger = new Logger(WildberriesHandler.name);

	website = 'wildberries';

	async collectLinks(input: CollectLinksInput): Promise<string[]> {
		const { searchInput, itemsLimit, jobId } = input;

		const collectedLinks: string[] = [];

		const launchOptions = {
			maxConcurrency: 1,
			requestHandlerTimeoutSecs: 2_000_000,
			launchContext: {
				launchOptions: {
					headless: true,
					args: [
						'--no-sandbox',
						'--disable-setuid-sandbox',
						'--disable-dev-shm-usage',
						'--disable-gpu',
						'--disable-features=site-per-process,IsolateOrigins',
					],
				},
			},
		};

		await new PlaywrightCrawler({
			...launchOptions,
			requestHandler: async ({ page }) => {
				const mainPage = new MainPage(page);
				await mainPage.open();
				const searchPage = await mainPage.searchByQuery(searchInput);

				const searchSuccess = await searchPage.isSearchSuccess();
				if (!searchSuccess) {
					this.logger.warn(`Search not successful for query="${searchInput}"`);
					return;
				}

				const itemsLinks = await searchPage.getNthOrLessLinks(itemsLimit);
				itemsLinks.forEach((l) => collectedLinks.push(l));
			},
		}).run([
			{ url: BASE_URL, uniqueKey: `home#job:${jobId}-${randomUUID()}` },
		]);

		if (collectedLinks.length == 0) {
			return collectedLinks;
		}

		const linksWithImtId: string[] = [];

		await new PlaywrightCrawler({
			...launchOptions,
			requestHandler: async ({ page }) => {
				const itemPage = new ItemPage(page, page.url());
				await itemPage.openFeedbacks();
				linksWithImtId.push(page.url());
			},
		}).run(
			collectedLinks.map((l) => ({
				url: l,
				uniqueKey: `item#job:${jobId}-${crypto.randomUUID()}`,
			})),
		);

		return linksWithImtId;
	}

	private statusIdToState(statusId: number) {
		switch (statusId) {
			case 8:
				return 'Вернули';
			case 15:
				return 'Отказались';
			case 16:
				return 'Выкупили';
		}
	}

	async parseLink(input: ParseLinkInput): Promise<KafkaFeedbackMessage[]> {
		const { jobId, url, feedbacksPerItemLimit } = input;

		const itemdId = extractItemIdFromUrl(url);
		const imtId = extractImtIdFromUrl(url);

		const feedbacksResponse = await fetchFeedbacks(itemdId, imtId);

		const feedbacks = feedbacksResponse.feedbacks?.map(
			(wbfb) =>
				({
					jobId,
					feedback: {
						feedback_text: wbfb.text,
						feedback_rating: wbfb.productValuation,
						feedback_state: this.statusIdToState(wbfb.statusId),
						feedback_date: wbfb.createdDate,
						advantages_text: wbfb.pros,
						disadvantages_text: wbfb.cons,
						comment_text: '',
						source_url: url,
					},
				}) as KafkaFeedbackMessage,
		);

		if (feedbacks?.length && feedbacks?.length > feedbacksPerItemLimit) {
			return feedbacks.slice(0, feedbacksPerItemLimit);
		}

		return feedbacks || [];
	}
}
