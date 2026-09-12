# Redis Latency Runbook

## 목적
Redis 관련 응답 지연이 발생했을 때 확인해야 할 항목과 대응 절차를 정의한다.

## 확인 순서

### 1. Connection Pool
- Active connection 수 확인
- Maximum connection 수 확인
- Connection 획득 대기 시간 확인

### 2. Cache
- Cache hit ratio 확인
- Cache miss 증가 여부 확인

### 3. Redis Server
- CPU 사용률 확인
- Memory 사용률 확인
- Network latency 확인

### 4. Application
- Redis command timeout 확인
- Application thread 상태 확인

## 대응
Connection pool 고갈이 확인된 경우 트래픽 수준과 Redis 서버 상태를 확인한 뒤
connection pool 크기 조정을 검토한다.