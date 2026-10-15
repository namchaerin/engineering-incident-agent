import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;

  const mockDocuments = [
    { id: '1', title: 'Redis 장애 보고서' },
    { id: '2', title: 'Payment API 장애 보고서' },
  ];

  const mockAppService = {
    getDocuments: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockAppService.getDocuments.mockResolvedValue(mockDocuments);

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: mockAppService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('GET /documents', () => {
    it('AppService.getDocuments()의 결과를 반환한다', async () => {
      const result = await appController.getDocuments();

      expect(mockAppService.getDocuments).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockDocuments);
    });
  });
});
