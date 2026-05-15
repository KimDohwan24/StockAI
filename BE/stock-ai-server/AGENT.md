# AGENT.md — stock-ai-server

> AI 뉴스 기반 주식 추천 서비스의 **AI/ML 연산 및 뉴스 감성 분석 서버** (FastAPI)

---

## 1. 프로젝트 개요

- **역할:** 실시간 뉴스 감성 분석, 종목 매핑, 사용자 위험 성향 기반 맞춤형 종목 추천
- **통신:** Spring Boot Core API와 HTTP API로 통신 (Core API가 호출자, FastAPI가 응답자)
- **데이터 흐름:** Kafka → NLP 분석 → Redis 캐싱 → Spring Boot 응답

---

## 2. 기술 스택

| 기술 | 버전 | 역할 |
|------|------|------|
| FastAPI | >=0.110.0 | 고성능 ASGI 웹 프레임워크 |
| Uvicorn | >=0.29.0 | ASGI 서버, 비동기 처리 |
| Pydantic | >=2.6.0 | 데이터 검증 및 직렬화 |
| PyTorch | >=2.2.0 | 딥러닝 모델 추론 |
| Transformers | >=4.38.0 | Hugging Face NLP 모델 (감성 분석) |
| BeautifulSoup4 | >=4.12.0 | 뉴스 HTML 파싱 |
| Selenium | >=4.18.0 | 동적 웹페이지 크롤링 |
| SQLAlchemy | >=2.0.0 | ORM (PostgreSQL) |
| Redis | >=5.0.0 | 캐싱 |
| aiokafka | >=0.9.0 | Kafka 비동기 Consumer |

**추가 인프라 (로컬 개발 시 Docker):**
- Kafka: 뉴스 수집 → 분석 파이프라인 메시지 브로커
- Redis: 분석 결과 캐싱
- PostgreSQL: 분석 로그 및 모델 버전 관리
- Elasticsearch: (선택) 뉴스 풀 텍스트 검색

---

## 3. 프로젝트 구조

```
stock-ai-server/
├── app/
│   ├── main.py              # FastAPI 앱 인스턴스, lifespan, 라우터 등록
│   ├── core/
│   │   ├── config.py        # 환경 변수 및 설정 (pydantic-settings)
│   │   ├── dependencies.py  # 공통 의존성 주입 (싱글톤)
│   │   └── exceptions.py    # 커스텀 예외 및 핸들러
│   ├── api/
│   │   ├── health.py        # 헬스체크
│   │   ├── analyze.py       # 뉴스 감성 분석 엔드포인트
│   │   └── recommend.py     # 종목 추천 엔드포인트
│   ├── services/
│   │   ├── sentiment_service.py       # 감성 분석 비즈니스 로직
│   │   ├── recommendation_service.py  # RiskScore 계산 및 매칭
│   │   └── stock_mapper.py            # 뉴스 → 종목 매핑
│   ├── models/
│   │   └── nlp_model.py     # Hugging Face 모델 로드/추론 래퍼 (싱글톤)
│   ├── schemas/
│   │   ├── request.py       # Pydantic 요청 DTO
│   │   └── response.py      # Pydantic 응답 DTO
│   └── infrastructure/
│       ├── redis_client.py  # Redis 캐시 클라이언트
│       ├── database.py      # PostgreSQL 연결 및 세션
│       └── kafka_consumer.py # Kafka 토픽 구독
├── tests/
│   ├── test_sentiment.py
│   └── test_recommendation.py
├── venv/                    # Python 가상환경
├── .env                     # 환경 변수 (Git 커밋 금지)
├── requirements.txt
├── AGENT.md                 # 본 파일 (프로젝트 맥락)
└── SKILL.md                 # 기술 패턴 상세 가이드
```

---

## 4. 핵심 설계 전략

### 4.1 뉴스 감성 분석 파이프라인

```
Kafka Consumer 수집 → NLP 모델 감성 분석 → 종목 매핑 → Redis 캐싱
```

- **수집:** Kafka Consumer가 언론사 API/RSS 기반 뉴스를 수신
- **분석:** `transformers` 기반 NLP 모델로 뉴스 텍스트의 감성 점수 산출 (범위: **-1.0 ~ 1.0**)
- **매핑:** 뉴스 내용에서 종목명/티커를 추출하여 관련 종목과 연결
- **캐싱:** 분석 결과를 Redis에 TTL과 함께 저장하여 동일 뉴스 재분석 방지

### 4.2 추천 알고리즘

```
RiskScore = (Volatility × W1) + (Sentiment × W2)
Recommendation = Match(UserRiskProfile, RiskScore)
```

| 사용자 유형 | 변동성 가중치 | 감성 신뢰도 |
|-------------|--------------|-------------|
| 하이리스크 (aggressive) | 85% | 15% |
| 중간리스크 (moderate) | 50% | 50% |
| 로우리스크 (conservative) | 20% | 70% |

### 4.3 성능 목표

- **API 응답 시간:** 100ms 이하 (Redis 캐시 히트 시)
- **동시 처리:** Uvicorn 비동기 워커 Non-blocking I/O
- **확장성:** Kubernetes HPA 기반 오토스케일링 대응

### 4.4 연동 규약

- **프로토콜:** Spring Boot → FastAPI HTTP JSON API (내부 통신)
- **인증:** 내부 네트워크 통신으로 API Key 또는 JWT (추후 협의)
- **데이터 포맷:** Pydantic 기반 엄격한 Request/Response 스키마 검증

---

## 5. API 연동 정보 (개발 환경)

| 서비스 | 주소/포트 | 설명 |
|--------|-----------|------|
| FastAPI 서버 | `http://localhost:8000` | 본 서버 실행 주소 |
| Spring Boot | `http://localhost:8080` | 메인 API 서버 (호출자) |
| Kafka | `localhost:9092` | 뉴스 메시지 브로커 |
| Redis | `localhost:6379` | 캐시/세션 |
| PostgreSQL | `localhost:5432` | 메인 데이터베이스 |
| Elasticsearch | `localhost:9200` | 뉴스 검색 엔진 (선택) |

---

## 6. 시작 방법

### 6.1 가상환경 활성화 (Windows)

```powershell
venv\Scripts\activate
```

### 6.2 의존성 설치 (최초 1회)

```bash
pip install -r requirements.txt
```

### 6.3 서버 실행 (개발 모드)

```bash
# Hot-reload 포함
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 또는
python -m uvicorn app.main:app --reload --port 8000
```

### 6.4 API 문서 확인

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### 6.5 환경 변수 (.env 예시)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/stock_ai
REDIS_URL=redis://localhost:6379/0
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
SPRING_BOOT_URL=http://localhost:8080
MODEL_NAME=snunlp/KR-FinBert-SC
MODEL_DEVICE=cpu
INTERNAL_API_KEY=your-secret-key
```

---

## 7. 배포 및 인프라

- **컨테이너화:** `Dockerfile` + `docker-compose.yml` (미작성)
- **오케스트레이션:** AWS EKS 또는 Docker Swarm
- **모니터링:** Prometheus + Grafana (FastAPI `prometheus-client` 연동)
- **CI/CD:** GitHub Actions → Docker Build → EKS Rolling Update

---

## 8. 참고 문서

- **기술 패턴:** [SKILL.md](SKILL.md) — FastAPI DI, Pydantic, 비동기 처리, NLP 모델 로딩, Redis 캐싱, 테스트 구체적 사용법
- **메인 API 문서:** `../stock-core-api/AGENT.md`
- **프로젝트 전체:** `../../AGENT.md` — Git 브랜치 전략, 커밋 규칙

---

> 본 문서는 `stock-ai-server` 전용입니다.
