import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { DocumentsService } from './documents.service.js';
import { EmbeddingsService } from '../embeddings/embeddings.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('DocumentsService', () => {
  let service: DocumentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: PrismaService,
          useValue: {
            document: {
              findMany: vi.fn(),
              findUnique: vi.fn(),
              create: vi.fn(),
            },
            $queryRaw: vi.fn(),
            $executeRaw: vi.fn(),
          },
        },
        {
          provide: EmbeddingsService,
          useValue: {
            embed: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
