import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module.js';
import { RagController } from './rag.controller.js';
import { RagService } from './rag.service.js';

@Module({
  imports: [DocumentsModule],
  controllers: [RagController],
  providers: [RagService],
})
export class RagModule {}
