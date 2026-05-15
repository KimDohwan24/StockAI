# AGENT.md — stock-core-api

> AI 뉴스 기반 주식 추천 서비스의 **Core API** (Spring Boot)
> 금융 트랜잭션, 인증, 외부 AI 서버(FastAPI) 오케스트레이션 담당

---

## 1. 프로젝트 개요

- **역할:** 사용자 인증/인가, 주식 데이터 관리, 포트폴리오, AI 서버 오케스트레이션
- **통신:** FastAPI AI 서버(`http://localhost:8000`)를 HTTP로 호출, Redis 캐싱
- **클라이언트:** Next.js 프론트엔드 (`http://localhost:3000`) 와 REST API 통신

---

## 2. 기술 스택

| 기술 | 버전 | 역할 |
|------|------|------|
| Java | 17 | 언어 |
| Spring Boot | 4.0.6 | 메인 프레임워크 |
| Spring Data JPA | 4.0.6 | ORM, 데이터베이스 접근 |
| Spring Data Redis | 4.0.6 | 캐싱, 세션 |
| Spring WebFlux | 4.0.6 | 비동기 HTTP 클라이언트 (WebClient) |
| Spring Security | 4.0.6 | 인증/인가 |
| JJWT | 0.12.6 | JWT 토큰 생성/검증 |
| PostgreSQL | — | 메인 데이터베이스 |

---

## 3. 프로젝트 구조

```
stock-core-api/
├── src/
│   ├── main/
│   │   ├── java/com/stock/
│   │   │   ├── StockCoreApiApplication.java
│   │   │   ├── domain/           # Entity, Repository
│   │   │   ├── service/          # 비즈니스 로직
│   │   │   ├── controller/       # REST API + DTO
│   │   │   ├── infrastructure/   # Config, Client, Security
│   │   │   └── exception/        # 공통 예외 처리
│   │   └── resources/
│   │       ├── application.yml   # 설정 파일
│   │       └── static/templates/
│   └── test/
│       └── java/com/stock/
├── build.gradle
├── settings.gradle
├── gradlew / gradlew.bat
├── HELP.md
├── AGENT.md                  # 본 파일 (프로젝트 맥락)
└── SKILL.md                  # 기술 패턴 상세 가이드
```

---

## 4. 핵심 도메인

| 도메인 | 설명 |
|--------|------|
| User | 사용자 계정, 프로필, 위험 성향 |
| Stock | 주식 종목 정보, 실시간/과거 시세 |
| NewsArticle | 수집된 뉴스 원문, 출처, 수집 시간 |
| Recommendation | AI 서버가 생성한 추천 결과 |
| UserRiskProfile | 사용자 투자 성향 설문 결과 |
| Portfolio | 사용자 보유 종목 및 비중 |

---

## 5. API 컨벤션

- **Base Path:** `/api/v1`
- **DTO 네이밍:** PascalCase + Suffix
  - 요청: `SignupRequest`, `StockSearchRequest`
  - 응답: `TokenResponse`, `StockDetailResponse`
- **공통 응답 래퍼:** 추후 구현 예정 (`ApiResponse<T>`)

---

## 6. 외부 연동

| 시스템 | 상태 | 비고 |
|--------|------|------|
| FastAPI | 활성 | `app.ai-server.url`로 호출. 감성 분석, 추천 생성 |
| Redis | 활성 | 실시간 주가/추천 캐싱. TTL 기반 |
| KIS API | **활성** | 한국투자증권 Open API. 주가 조회, 주문, 계좌 연동 |
| Kafka | **추후 연동** | 뉴스 파이프라인 메시지 브로커 |
| Elasticsearch | **추후 연동** | 뉴스 키워드 검색 인덱싱 |

---

## 7. 보안

- **JWT Access Token** — 유효기간 24h
- **BCrypt** — 비밀번호 해싱
- **Role 기반 접근 제어** — `ROLE_USER`, `ROLE_ADMIN`
- **FastAPI 내부 통신** — API Key 또는 JWT (추후 협의)

---

## 8. 에러 코드 체계

`{도메인}_{번호}` 형식

| 코드 | 메시지 | HTTP |
|------|--------|------|
| AUTH_001 | 인증 실패 | 401 |
| AUTH_002 | 토큰 만료 | 401 |
| AUTH_005 | 이메일 중복 | 409 |
| USER_001 | 사용자 없음 | 404 |
| STOCK_001 | 종목 없음 | 404 |
| SYSTEM_002 | 내부 서버 오류 | 500 |

---

## 9. 성능 목표

- 캐시 기반 응답 **100ms 이하**
- FastAPI 호출 시 **WebClient 비동기** 처리
- DB 조회 시 **JPA N+1 방지** (Fetch Join 또는 Entity Graph)

---

## 10. 시작 방법

```bash
cd BE/stock-core-api

# Gradle Wrapper로 실행
./gradlew bootRun              # macOS/Linux
gradlew.bat bootRun            # Windows

# 또는 빌드 후 실행
./gradlew build
java -jar build/libs/stock-core-api-0.0.1-SNAPSHOT.jar
```

---

## 11. 추후 개발 예정

- 공통 응답 래퍼 (`ApiResponse<T>`)
- WebSocket 실시간 추천 푸시
- Kafka Consumer (뉴스 수집)
- Elasticsearch 연동 (뉴스 검색)
- gRPC (FastAPI 간 고성능 통신 검토)

---

## 12. 참고 문서

- **기술 패턴:** [SKILL.md](SKILL.md) — Spring Boot 4, JPA, WebClient, Spring Security, JWT, Redis 캐싱 구체적 사용법
- **AI 서버 문서:** `../stock-ai-server/AGENT.md`
- **프로젝트 전체:** `../../AGENT.md` — Git 브랜치 전략, 커밋 규칙

---

> 본 문서는 `stock-core-api` 전용입니다.
