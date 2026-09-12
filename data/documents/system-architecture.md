# Payment System Architecture

## Overview

Payment Service는 결제 요청을 처리하는 백엔드 서비스다.

## Architecture

Client
→ API Gateway
→ Payment API
→ PostgreSQL

Payment API는 반복 조회되는 데이터를 Redis에 캐싱한다.

## Components

### API Gateway
외부 요청을 받아 Payment API로 전달한다.

### Payment API
결제 요청 처리와 결제 정보 조회를 담당한다.

### PostgreSQL
결제 데이터와 거래 정보를 저장한다.

### Redis
반복적으로 조회되는 데이터를 캐싱하여 데이터베이스 부하를 줄인다.