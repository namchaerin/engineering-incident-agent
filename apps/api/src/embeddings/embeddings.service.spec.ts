import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmbeddingsService } from './embeddings.service.js';
import { vi } from 'vitest';

describe('EmbeddingsService', () => {
  let service: EmbeddingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmbeddingsService,
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn().mockReturnValue('test-api-key'),
            getOrThrow: vi.fn().mockReturnValue('test-api-key'),
          },
        },
      ],
    }).compile();

    service = module.get<EmbeddingsService>(EmbeddingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
