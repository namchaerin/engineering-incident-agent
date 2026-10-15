import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentService } from './agent.service.js';
import type { ConfigService } from '@nestjs/config';
import type { DocumentsService } from '../documents/documents.service.js';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
}));

vi.mock('openai', () => ({
  default: class {
    responses = {
      create: mocks.create,
    };
  },
}));

describe('AgentService - Tool Cache', () => {
  let service: AgentService;
  let search: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    search = vi.fn().mockResolvedValue([
      {
        title: 'Redis Latency Runbook',
        fileName: 'redis-runbook.md',
        content: 'Redis connection pool 확인',
        distance: 0.3,
      },
    ]);

    const configService = {
      getOrThrow: vi.fn().mockReturnValue('test-api-key'),
    } as unknown as ConfigService;

    const documentsService = {
      search,
      getIncident: vi.fn(),
    } as unknown as DocumentsService;

    service = new AgentService(configService, documentsService);
  });

  it('동일한 Tool과 인자를 반복 호출해도 실제 검색은 한 번만 실행한다', async () => {
    mocks.create
      .mockResolvedValueOnce({
        id: 'response-1',
        output: [
          {
            type: 'function_call',
            name: 'search_documents',
            call_id: 'call-1',
            arguments: JSON.stringify({ query: 'Redis 장애' }),
          },
        ],
        output_text: '',
      })
      .mockResolvedValueOnce({
        id: 'response-2',
        output: [
          {
            type: 'function_call',
            name: 'search_documents',
            call_id: 'call-2',
            arguments: JSON.stringify({ query: 'Redis 장애' }),
          },
        ],
        output_text: '',
      })
      .mockResolvedValueOnce({
        id: 'response-3',
        output: [],
        output_text: 'Redis 장애 대응 결과',
      });

    const result = await service.ask('Redis 장애 대응 방법 알려줘');

    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith('Redis 장애', 3);

    expect(result.toolCalls).toHaveLength(2);
    expect(result.answer).toBe('Redis 장애 대응 결과');

    expect(mocks.create).toHaveBeenCalledTimes(3);
  });


  it('서로 다른 검색어는 각각 검색한다', async () => {
    mocks.create
      .mockResolvedValueOnce({
        id: 'response-1',
        output: [
          {
            type: 'function_call',
            name: 'search_documents',
            call_id: 'call-1',
            arguments: JSON.stringify({ query: 'Redis 장애' }),
          },
          {
            type: 'function_call',
            name: 'search_documents',
            call_id: 'call-2',
            arguments: JSON.stringify({ query: 'Payment 장애' }),
          },
        ],
        output_text: '',
      })
      .mockResolvedValueOnce({
        id: 'response-2',
        output: [],
        output_text: '검색 완료',
      });

    const result = await service.ask('Redis와 Payment 장애를 비교해줘');

    expect(search).toHaveBeenCalledTimes(2);
    expect(search).toHaveBeenNthCalledWith(1, 'Redis 장애', 3);
    expect(search).toHaveBeenNthCalledWith(2, 'Payment 장애', 3);
    expect(result.toolCalls).toHaveLength(2);
  });

  it('서로 다른 ask 요청에서는 캐시를 공유하지 않는다', async () => {
    mocks.create
      .mockResolvedValueOnce({
        id: 'response-1',
        output: [
          {
            type: 'function_call',
            name: 'search_documents',
            call_id: 'call-1',
            arguments: JSON.stringify({ query: 'Redis 장애' }),
          },
        ],
        output_text: '',
      })
      .mockResolvedValueOnce({
        id: 'response-2',
        output: [],
        output_text: '첫 번째 답변',
      })
      .mockResolvedValueOnce({
        id: 'response-3',
        output: [
          {
            type: 'function_call',
            name: 'search_documents',
            call_id: 'call-3',
            arguments: JSON.stringify({ query: 'Redis 장애' }),
          },
        ],
        output_text: '',
      })
      .mockResolvedValueOnce({
        id: 'response-4',
        output: [],
        output_text: '두 번째 답변',
      });

    const first = await service.ask('Redis 장애 알려줘');
    const second = await service.ask('Redis 장애 다시 알려줘');

    expect(search).toHaveBeenCalledTimes(2);
    expect(first.answer).toBe('첫 번째 답변');
    expect(second.answer).toBe('두 번째 답변');
  });

});
