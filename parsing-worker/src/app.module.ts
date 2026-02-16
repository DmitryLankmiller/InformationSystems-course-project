import { Module } from '@nestjs/common';
import { KafkaModule } from './kafka/kafka.module';
import { WorkerModule } from './worker/worker.module';

@Module({
  imports: [KafkaModule, WorkerModule],
})
export class AppModule {}
