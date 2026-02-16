import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	let connected = false;
	let retries = Number(process.env.KAFKA_CONNECT_RETRIES || 5);

	while (!connected && retries > 0) {
		try {
			app.connectMicroservice<MicroserviceOptions>({
				transport: Transport.KAFKA,
				options: {
					client: {
						clientId: process.env.KAFKA_CLIENT_ID || 'parsing-worker',
						brokers: [(process.env.KAFKA_BROKERS as string) || 'kafka:9092'],
						retry: {
							initialRetryTime: 1000,
							retries: 8,
						},
					},
					consumer: {
						groupId: process.env.KAFKA_CONSUMER_GROUP || 'parsing-worker-group',
					},
				},
			});

			await app.startAllMicroservices();
			connected = true;
			console.log('Successfully connected to Kafka microservice');
		} catch (error) {
			console.error(
				`Failed to connect to Kafka: ${(error as { message: string }).message}`,
			);
			retries--;
			if (retries === 0) {
				console.error('Max retries reached, could not connect to Kafka');
			} else {
				console.log(`Retrying in 5 seconds... (${retries} attempts left)`);
				await new Promise((resolve) => setTimeout(resolve, 5000));
			}
		}
	}

	await app.listen(process.env.PORT ? Number(process.env.PORT) : 3002);
}
bootstrap()
	.then(() => {
		console.log('Parsing Worker start SUCCESSFULLY!');
	})
	.catch(() => {
		console.log('Parsing Worker start FAILED.');
	});
