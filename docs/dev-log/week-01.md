# Week 01 Development Log

## Day 1

### 오늘 한 작업

- 프로젝트 Repository 생성
- 프로젝트 기본 디렉터리 구성
- NestJS API 프로젝트 생성
- NestJS 서버 구동 확인
- RAG 테스트용 샘플 문서 생성

### 초기 아키텍처 방향

API/비즈니스 로직과 AI 처리를 분리하는 구조를 고려한다.

- NestJS: API 및 애플리케이션 로직
- Python AI Service: RAG / Embedding / Agent 처리

두 영역을 분리하여 각각의 책임을 명확하게 하고,
향후 독립적인 확장 및 배포가 가능하도록 구성할 예정이다.

### 테스트 데이터

RAG 검색 품질을 확인하기 위해 서로 연관된 세 종류의 문서를 구성했다.

- Incident
- Runbook
- Architecture

향후 유사한 Incident를 추가하여 단순 Vector Similarity Search의
한계를 확인하고 Retrieval 전략을 개선할 예정이다.

### 다음 작업

- PostgreSQL 실행 환경 구성
- pgvector 적용
- NestJS ↔ PostgreSQL 연결