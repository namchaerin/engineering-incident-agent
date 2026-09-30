import { Body, Controller, Post } from '@nestjs/common';
import { AgentService } from './agent.service.js';

@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('ask')
  ask(@Body('question') question: string) {
    return this.agentService.ask(question);
  }
}
