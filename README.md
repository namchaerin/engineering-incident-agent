# Engineering Incident Agent

개발팀의 장애 대응을 지원하는 AI Agent 프로젝트입니다.

## Problem

서비스 장애가 발생했을 때 개발자는 과거 장애 보고서, Runbook,
시스템 아키텍처 문서 등을 각각 검색하여 원인과 대응 방법을 찾아야 합니다.

Engineering Incident Agent는 사내 기술 문서를 기반으로
과거 유사 장애와 대응 방법을 검색하고,
향후 로그 및 메트릭 Tool까지 활용하여 장애 대응을 지원하는 것을 목표로 합니다.

## Core Scenario

사용자 질문:

> "Payment API 응답 시간이 갑자기 7초 이상 걸리는데
> 과거에 비슷한 장애가 있었어?"

Agent:

1. 관련 Incident 검색
2. 과거 장애 원인 확인
3. 관련 Runbook 검색
4. 대응 방법 제안
5. 관련 근거 문서 제공

향후 Agent 기능:

- 로그 조회 Tool 호출
- Metric 조회
- 현재 상태와 과거 Incident 비교
- 장애 원인 분석 지원
- 대응 Runbook 추천

## Tech Stack

### Backend
- TypeScript
- NestJS

### AI
- Python
- RAG
- Vector Search

### Data
- PostgreSQL
- pgvector
- Redis

### Infrastructure
- Docker
- Kubernetes
- Helm
- ArgoCD

> 기술 스택은 프로젝트 진행 과정에서 변경될 수 있습니다.