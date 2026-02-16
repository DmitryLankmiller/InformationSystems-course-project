import { Module } from '@nestjs/common';
import { KafkaModule } from '../kafka/kafka.module';
import { WorkerController } from './worker.controller';
import { WorkerService } from './worker.service';
import { WildberriesHandler } from "./handlers/wildberries/wildberries.handler";

@Module({
	imports: [KafkaModule],
	providers: [WorkerService, WildberriesHandler],
	controllers: [WorkerController],
})
export class WorkerModule {}
