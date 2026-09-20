import { Body, Controller, Post } from '@nestjs/common';
import { RagService } from './rag.service.js';

@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post('ask')
  ask(@Body('question') question: string) {
    return this.ragService.ask(question);
  }
}
