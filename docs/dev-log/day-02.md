## Day 02

### 오늘 한 작업

- Docker 기반 PostgreSQL / pgvector 개발 환경 구성
- Prisma를 이용한 Document 스키마 및 Migration 구성
- NestJS ↔ Prisma ↔ PostgreSQL 연결
- Markdown 문서 Import Pipeline 구현
- Document와 DocumentChunk 간 1:N 관계 설계
- Markdown 문단 기반 Chunking Pipeline 구현
- OpenAI Embedding API 연동
- DocumentChunk Embedding 생성 및 pgvector 저장
- pgvector Cosine Distance 기반 Semantic Search 구현

### 트러블슈팅

#### PostgreSQL 포트 충돌

Prisma에서 PostgreSQL 접속 시 `P1010`, `role "agent" does not exist` 오류가 발생했다.

Docker PostgreSQL 설정 자체는 정상적이었으나 로컬 환경을 확인한 결과,
기존 PostgreSQL 및 SSH 프로세스가 5432 포트를 사용하고 있었다.

Docker PostgreSQL 포트를 5433으로 변경하여 애플리케이션이 의도한
PostgreSQL 인스턴스에 연결되도록 수정했다.

#### Prisma / NestJS 환경 구성

Prisma CLI와 Client 버전 불일치 및 ESM 환경의 import 경로 문제를 해결했다.

NestJS에서 Prisma를 사용할 수 있도록 PrismaService를 구성하고,
Document 조회 API를 통해 실제 PostgreSQL 연결을 검증했다.

### RAG Ingestion Pipeline

현재 문서 처리 과정은 다음과 같다.

Markdown Document
→ Document 저장
→ DocumentChunk 생성
→ OpenAI Embedding 생성
→ pgvector 저장

Document import 시 동일 파일이 중복 생성되지 않도록
`fileName`을 기준으로 upsert하도록 구현했다.

Chunk 재생성 시에는 기존 Chunk를 제거한 뒤 다시 생성하는
단순한 방식을 우선 적용했다.

### Semantic Search 검증

사용자 질문을 Embedding으로 변환한 뒤,
pgvector의 Cosine Distance를 이용하여 가장 가까운 Chunk Top-K를 검색하도록 구현했다.

예시 질문:

`캐시 서버에 문제가 생기면 뭘 확인해야 하지?`

검색 결과 상위 3개가 모두 `Redis Latency Runbook`에서 검색되어,
정확한 문서 제목이나 키워드를 사용하지 않아도 의미 기반 검색이 동작함을 확인했다.

또한:

`우리 시스템 구조가 어떻게 되어 있어?`

질문에서는 `Payment System Architecture` 문서의 Chunk가 상위 결과로 검색되었다.

### 발견한 문제

현재 Chunking은 Markdown을 빈 줄 기준으로 분할한다.

실제 Semantic Search 결과를 확인한 결과 다음과 같은 정보량이 적은 Chunk가
검색 상위에 노출되는 문제가 발견되었다.

- `## 확인 순서`
- `## Architecture`

Heading과 실제 본문이 서로 다른 Chunk로 분리되기 때문이다.

단순히 Vector Search 구현 여부만 확인하는 것이 아니라,
Chunk 구성 방식이 Retrieval 품질에 직접 영향을 준다는 것을 확인했다.

### 다음 작업

- Heading-aware Chunking 적용
- 동일한 평가 질문으로 변경 전/후 Retrieval 결과 비교
- 검색 결과를 Context로 사용하는 RAG Answer Generation 구현
- 답변에 Source 정보 포함