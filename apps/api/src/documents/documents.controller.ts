import { Controller, Get, Post, Query } from '@nestjs/common';
import { DocumentsService } from './documents.service.js';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  findAll() {
    return this.documentsService.findAll();
  }

  @Post('import')
  importDocuments() {
    return this.documentsService.importDocuments();
  }

  @Post('chunks')
  createChunks() {
    return this.documentsService.createChunks();
  }

  @Post('embeddings')
  generateEmbeddings() {
    return this.documentsService.generateEmbeddings();
  }

  @Get('search')
  search(@Query('q') query: string, @Query('limit') limit?: string) {
    return this.documentsService.search(query, limit ? Number(limit) : 3);
  }

}
