# INC-2026-001 Payment API Latency

## 장애 개요
2026년 7월 15일 Payment API의 응답 시간이 급격히 증가했다.

## 증상
- 정상 평균 응답 시간: 약 300ms
- 장애 발생 시 평균 응답 시간: 7~8초
- 동시 요청량이 약 2,000 RPS를 초과한 시점부터 응답 지연 발생

## 원인
트래픽 증가로 Redis connection pool이 고갈되었다.

애플리케이션이 Redis connection을 획득하기 위해 대기하면서
Payment API 전체 응답 시간이 증가했다.

## 조치
Redis connection pool 크기를 50에서 200으로 증가시켰다.

## 후속 조치
- Redis active connection 모니터링 추가
- Cache hit ratio 모니터링 추가
- Redis connection 획득 시간에 대한 알람 추가