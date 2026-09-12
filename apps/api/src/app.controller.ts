import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('documents')
  getDocuments() {
    return this.appService.getDocuments();
  }
}
