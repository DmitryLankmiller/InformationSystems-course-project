import {
	Inject,
	Injectable,
	OnModuleDestroy,
	OnModuleInit,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { Kafka, Admin, Producer, Consumer, Partitioners } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
	constructor(
		@Inject('KAFKA_CLIENT') private readonly clientKafka: ClientKafka,
		@Inject('KAFKA_JS') private readonly rawKafka: Kafka,
	) {}

	private admin!: Admin;
	private producer!: Producer;

	private readonly waitTopics: string[] = [
		process.env.JOBS_TOPIC || 'parsing-jobs',
		process.env.LINKS_TOPIC || 'parsing-links-collected',
	];

	async onModuleInit(): Promise<void> {
		try {
			await this.clientKafka.connect();
			console.log('ClientKafka connected (Nest Client)');

			this.admin = this.rawKafka.admin();
			await this.admin.connect();
			console.log('KafkaJS admin connected');

			await this.waitForTopicsReady(
				this.waitTopics,
				Number(process.env.KAFKA_WAIT_TIMEOUT_MS) || 30000,
			);

			this.producer = this.rawKafka.producer({
				createPartitioner: Partitioners.LegacyPartitioner,
			});
			await this.producer.connect();
			console.log('KafkaJS producer connected');
		} catch (err) {
			console.error('KafkaService onModuleInit error', err);

			throw err;
		}
	}

	async onModuleDestroy(): Promise<void> {
		try {
			if (this.producer) await this.producer.disconnect();
			if (this.admin) await this.admin.disconnect();

			await this.clientKafka.close();
		} catch (err) {
			console.warn('KafkaService onModuleDestroy error', err);
		}
	}

	async createConsumer(groupId: string): Promise<Consumer> {
		const consumer = this.rawKafka.consumer({ groupId });
		await consumer.connect();
		return consumer;
	}

	async subscribeAndRun(
		groupId: string,
		topic: string,
		eachMessage: (message: any) => Promise<void>,
	): Promise<void> {
		const consumer = this.rawKafka.consumer({ groupId });
		await consumer.connect();
		await consumer.subscribe({ topic, fromBeginning: false });
		await consumer.run({
			eachMessage: async ({ topic: _topic, partition, message }) => {
				const value = message.value?.toString();
				try {
					if (!value) return;
					const parsed = JSON.parse(value);
					await eachMessage(parsed);
				} catch (err) {
					console.error('Error processing message from Kafka', err, value);
				}
			},
		});
		console.log(`Kafka consumer subscribed to ${topic} (group=${groupId})`);
	}

	async produce(topic: string, payload: object): Promise<void> {
		if (!this.producer) {
			throw new Error('Kafka producer not initialized');
		}
		const value = JSON.stringify(payload);
		await this.producer.send({
			topic,
			messages: [{ value }],
		});
	}

	private async waitForTopicsReady(
		topics: string[],
		timeoutMs = 30_000,
	): Promise<void> {
		const start = Date.now();
		const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
		console.log('Waiting for topic leaders:', topics);
		while (Date.now() - start < timeoutMs) {
			try {
				const metadata = await this.admin.fetchTopicMetadata({ topics });
				let allReady = true;
				for (const t of metadata.topics) {
					if (t.partitions.length === 0) {
						allReady = false;
						break;
					}
					for (const p of t.partitions) {
						if (p.leader === -1) {
							allReady = false;
							break;
						}
					}
					if (!allReady) break;
				}
				if (allReady) {
					console.log('All topics have leaders assigned.');
					return;
				}
			} catch (err) {
				console.warn('Error fetching topic metadata, will retry', err);
			}
			await sleep(1000);
		}
		throw new Error(`Timeout waiting for topics leaders after ${timeoutMs}ms`);
	}
}
