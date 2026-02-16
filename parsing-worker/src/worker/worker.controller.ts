import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ParsingJobMessage } from '../utils/types';
import { WorkerService } from './worker.service';

@Controller()
export class WorkerController {
	constructor(private readonly workerService: WorkerService) {}

	@MessagePattern(process.env.JOBS_TOPIC || 'parsing-jobs')
	async handleParsingJob(@Payload() msg: ParsingJobMessage) {
		return await this.workerService.processJob(msg);
	}
}
