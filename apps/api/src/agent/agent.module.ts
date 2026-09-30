import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module.js';
import { AgentController } from './agent.controller.js';
import { AgentService } from './agent.service.js';

@Module({
  imports: [DocumentsModule],
  controllers: [AgentController],
  providers: [AgentService],
})
export class AgentModule {}
