# Agent Evaluation v0.1

## 1. 목적

Engineering Incident Response Agent가 다음 항목을 올바르게 수행하는지 검증한다.

- 일반 질문과 내부 시스템 질문 구분
- 적절한 Tool 선택
- Incident ID 기반 정확 조회
- Semantic Search 기반 문서 검색
- Multi-tool 호출 및 결과 조합
- 문서에 존재하지 않는 정보에 대한 hallucination 방지
- 내부 문서 기반 Grounding

## 2. 테스트 환경

- Agent: OpenAI Responses API 기반 Tool Calling Agent
- Tools
    - `search_documents`
    - `get_incident`
- Retrieval
    - OpenAI Embedding
    - PostgreSQL + pgvector
    - Vector Top-K Search
- Max Agent Iterations: 5

---

## 3. 평가 결과

| # | 테스트 | 기대 동작 | 결과 |
|---|---|---|---|
| 1 | 일반 대화 | Tool 미사용 | PASS |
| 2 | Incident ID 조회 | get_incident 호출 | PASS |
| 3 | 과거 장애 의미 검색 | search_documents 호출 | PASS |
| 4 | 존재하지 않는 Kafka 정보 | 정보 부족 응답, hallucination 없음 | PASS |
| 5 | 존재하지 않는 Incident ID | 존재하지 않음을 판단 | PASS |
| 6 | Architecture 질문 | Architecture 문서 검색 | PASS |
| 7 | Incident + Runbook 비교 | Multi-tool 호출 및 결과 조합 | PASS |
| 8 | 문서에 없는 PostgreSQL CPU 수치 | 수치 생성 없이 정보 부족 응답 | PASS |
| 9 | 일반 HTTP 질문 | Tool 미사용 | PASS |
| 10 | 알려진 정보 + 없는 정보 혼합 | 알려진 내용만 답하고 없는 정보는 명시 | PASS |

**Result: 10 / 10 PASS**

---

## 4. 주요 검증 사례

### 4.1 Multi-tool reasoning

질문:

> INC-2026-001에서 발생한 문제와 실제 조치를 설명하고,
> 현재 Redis 장애 대응 Runbook과 비교해서 추가로 확인해야 할 항목도 알려줘.

호출된 Tool:

1. `get_incident`
2. `search_documents`

Agent는 Incident와 Runbook을 각각 조회한 뒤 두 결과를 비교했다.

Incident에 기록된 조치:

- Redis connection pool 50 → 200
- Active connection monitoring
- Cache hit ratio monitoring
- Connection acquisition time alert

Runbook에는 추가로 다음 항목이 존재했다.

- Redis CPU
- Redis Memory
- Network latency
- Redis command timeout
- Application thread state

이를 통해 Agent가 단순 Tool 호출뿐 아니라
여러 Tool의 결과를 조합하여 답변할 수 있음을 확인했다.

---

### 4.2 Missing information grounding

질문:

> INC-2026-001의 장애 원인과 실제 조치를 알려주고,
> 당시 Redis 서버의 CPU 사용률도 알려줘.

문서에는 장애 원인과 조치는 존재하지만
당시 Redis CPU 사용률 수치는 존재하지 않는다.

Agent 결과:

- 장애 원인 → 정상 응답
- 실제 조치 → 정상 응답
- Redis CPU → 문서에서 확인할 수 없다고 응답

존재하지 않는 CPU 값을 생성하지 않았다.

---

## 5. 평가 과정에서 발견한 문제

### 5.1 Capability Overclaim

초기 Agent는 문서에 CPU 사용률이 없을 때 다음과 같은 추가 행동을 제안했다.

- Grafana 조회
- Prometheus 조회
- Metric query
- Monitoring system 접근

하지만 현재 Agent가 실제 사용할 수 있는 Tool은 다음 두 개뿐이다.

- `search_documents`
- `get_incident`

따라서 Agent instructions에 capability boundary를 추가했다.

### 개선 후

내부 시스템 질문에서는 Tool 결과에 존재하는 정보만 사용하도록 제한했다.

또한 다음 내용을 금지했다.

- Tool에 없는 시스템 접근을 주장하는 것
- 검색 결과에 없는 troubleshooting 절차 생성
- 일반적인 운영 지식 추가
- 임의의 metric/query/command 생성

재테스트 결과 Agent는 다음과 같이 응답했다.

> 제공된 문서들에서는 Redis 서버의 CPU 사용률 수치가 포함되어 있지 않습니다.
> 따라서 CPU 사용률은 현재 문서들만으로는 확인할 수 없습니다.

Capability overclaim이 제거된 것을 확인했다.

---

## 6. 발견된 개선 과제

### Duplicate Tool Calls

존재하지 않는 Kafka 장애 정보를 질문했을 때
Agent가 유사한 semantic search를 여러 번 수행했다.

향후 동일하거나 유사한 Tool 호출을 감지하여
불필요한 반복 검색을 방지한다.

### Retrieval Relevance

Vector Search가 항상 Top-K 결과를 반환하기 때문에
관련성이 낮은 문서도 검색 결과에 포함될 수 있다.

예:

- 존재하지 않는 Incident 검색
- 존재하지 않는 Kafka 장애 검색

향후 검토:

- Retrieval evaluation
- Hybrid Search
- Reranking
- Relevance filtering

현재 문서 수가 적기 때문에 임의의 distance threshold는 적용하지 않는다.

---

## 7. 결론

Agent v0.1 평가에서 10개 테스트 시나리오를 모두 통과했다.

특히 다음 동작을 검증했다.

- Tool selection
- Multi-tool execution
- Iterative Agent loop
- Tool result composition
- Grounded response
- Missing information handling
- General question / internal knowledge question separation

다음 개선 목표는 Duplicate Tool Call 방지와
Retrieval relevance 개선이다.