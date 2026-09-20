## Day 03

### 오늘 한 작업

- Markdown 문서의 Heading-aware Chunking 개선
- H1 문서 제목을 검색 Chunk에서 제외
- H2 기준으로 관련 본문을 하나의 Chunk로 구성
- 기존 Chunk 및 Embedding 재생성
- 동일 Query를 이용한 Semantic Search 재평가
- 검색된 Top-K Chunk를 Context로 구성
- OpenAI Responses API를 이용한 RAG Answer Generation 구현
- 답변에 사용된 Source 정보 반환
- 문서에 존재하지 않는 질문에 대한 응답 검증

### Chunking 개선

기존에는 빈 줄을 기준으로 문서를 분리해 Markdown Heading이 독립적인 Chunk로 생성되는 문제가 있었다.

예를 들어 다음과 같은 검색 결과가 발생했다.

- `## 확인 순서`
- `# Payment System Architecture`

Vector similarity는 높았지만 실제 본문 정보가 없어 RAG Context로 활용하기에는 정보량이 부족했다.

이를 개선하기 위해 H2를 의미 단위의 시작점으로 사용하고, Heading과 하위 본문을 하나의 Chunk로 구성하도록 변경했다.

H1은 이미 Document의 title로 관리하고 있기 때문에 검색 대상 Chunk에서는 제외했다.

### Semantic Search 재평가

Chunking 변경 후 기존과 동일한 Query를 사용해 검색 결과를 다시 확인했다.

`결제가 갑자기 느려졌어. 원인을 어떻게 찾지?`

- Payment API 장애 개요
- Payment API 증상
- Payment API 원인

`캐시 서버에 문제가 생기면 뭘 확인해야 하지?`

- Redis Runbook의 확인 순서
- Redis Runbook의 대응 방법
- 기존 Incident의 후속 조치

`우리 시스템 구조가 어떻게 되어 있어?`

- Architecture와 실제 시스템 흐름
- Components와 각 구성요소 설명

Heading-only Chunk가 검색되는 문제를 제거하고 실제 답변에 사용할 수 있는 Context가 검색되는 것을 확인했다.

또한 similarity distance가 더 낮다고 해서 반드시 RAG에 더 유용한 Chunk인 것은 아니라는 점을 확인했다.

### RAG Answer Generation

Semantic Search 결과를 실제 LLM 답변 생성에 연결했다.

현재 처리 흐름:

Question
→ Query Embedding
→ pgvector Semantic Search
→ Top-K Chunk Retrieval
→ Context 구성
→ LLM Answer Generation
→ Answer + Sources 반환

`POST /rag/ask` API를 추가했다.

Payment API 지연 원인을 질문했을 때 과거 Incident 문서에서 다음 정보를 검색해 답변을 생성하는 것을 확인했다.

- 정상 응답 시간 약 300ms
- 장애 발생 시 7~8초
- 약 2,000 RPS 이상에서 지연 발생
- Redis connection pool 고갈이 원인

답변에는 `[Source N]` 형식으로 사용한 근거도 함께 표시한다.

### Grounding 테스트

문서에 존재하지 않는 Kafka 장애 대응 방법을 질문했다.

Semantic Search 자체는 가장 가까운 Payment/Redis 관련 Chunk를 반환했지만, LLM은 해당 내용을 Kafka 장애 정보로 추론하지 않고 다음과 같이 응답했다.

> 제공된 문서들에는 Kafka 장애에 대한 조치 내용이 없습니다.

현재 Prompt 기반 Grounding이 정상적으로 동작하는 것을 확인했다.

다만 관련 문서가 없는 경우에도 Vector Search 결과 자체는 Sources에 포함되는 문제가 있다.

향후 데이터와 평가 Query가 충분히 확보되면 similarity threshold 또는 retrieval filtering 전략을 검토한다.

### 현재 RAG Pipeline

- Document Import
- Heading-aware Chunking
- OpenAI Embedding
- PostgreSQL + pgvector
- Cosine Similarity Search
- Top-K Retrieval
- Context Construction
- LLM Answer Generation
- Source Attribution
- Insufficient Context Handling

### 다음 작업

- Agent Tool Calling 구조 설계
- Document Search를 Agent Tool로 제공
- Agent가 질문에 따라 필요한 Tool을 선택하도록 구현
- 이후 MCP 기반 Tool 연동 검토