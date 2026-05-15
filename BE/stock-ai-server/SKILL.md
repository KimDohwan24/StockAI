# SKILL.md — stock-ai-server

> **Verifies**: FastAPI 0.136.1, Pydantic 2.13.4, Python 3.14, PyTorch 2.12, Transformers 5.8.1
> **Last Checked**: 2026-05-16
> **Module**: `BE/stock-ai-server/`

---

## 1. FastAPI Application Structure

### 1.1 Lifespan (Startup / Shutdown)

**핵심 규칙:** NLP 모델, Redis 등 무거운 리소스는 `lifespan`에서 1회 로드, `yield` 후 정리

```python
# ✅ app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.core.config import settings
from app.infrastructure.redis_client import RedisClient
from app.core.dependencies import redis_client

import logging

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info(f"Starting up {settings.APP_NAME}...")
    await redis_client.connect()
    # TODO: DB 테이블 생성 (필요시)
    # async with engine.begin() as conn:
    #     await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown
    logger.info(f"Shutting down {settings.APP_NAME}...")
    await redis_client.disconnect()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    lifespan=lifespan,
)
```

### 1.2 Router Registration

```python
# ✅ app/main.py (continued)
from app.api import health, analyze, recommend
from app.core.exceptions import BaseAppException, global_exception_handler, generic_exception_handler

# Global exception handlers (순서 중요: 구체적 → 일반)
app.add_exception_handler(BaseAppException, global_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# Routers
app.include_router(health.router)
app.include_router(analyze.router)
app.include_router(recommend.router)
```

---

## 2. Dependency Injection Pattern

### 2.1 Singleton Dependencies (Module Level)

**무거운 객체 (NLP 모델, Redis, DB)는 모듈 레벨 싱글톤으로 관리**

```python
# ✅ app/core/dependencies.py
from typing import AsyncGenerator
from app.infrastructure.database import AsyncSessionLocal
from app.infrastructure.redis_client import RedisClient
from app.models.nlp_model import NLPModel
from app.core.config import settings

# 싱글톤 인스턴스 (서버 시작 시 lifespan에서 초기화)
redis_client: RedisClient = RedisClient(settings.REDIS_URL)
nlp_model: NLPModel = NLPModel(settings.MODEL_NAME, settings.MODEL_DEVICE)

# FastAPI Depends용 생성기
async def get_db() -> AsyncGenerator:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

def get_redis() -> RedisClient:
    return redis_client

def get_nlp_model() -> NLPModel:
    return nlp_model
```

### 2.2 Service Dependencies (Class-based)

```python
# ✅ app/core/dependencies.py
from app.services.sentiment_service import SentimentService
from app.services.recommendation_service import RecommendationService
from app.services.stock_mapper import StockMapper

def get_sentiment_service() -> SentimentService:
    return SentimentService(model=nlp_model)

def get_recommendation_service() -> RecommendationService:
    return RecommendationService()

def get_stock_mapper() -> StockMapper:
    return StockMapper()
```

### 2.3 Endpoint Usage

```python
# ✅ app/api/analyze.py
from fastapi import APIRouter, Depends
from app.schemas.request import SentimentRequest
from app.schemas.response import SentimentResponse
from app.services.sentiment_service import SentimentService
from app.services.stock_mapper import StockMapper

router = APIRouter(prefix="/analyze", tags=["Sentiment Analysis"])

@router.post("", response_model=SentimentResponse)
async def analyze_news(
    request: SentimentRequest,
    sentiment_service: SentimentService = Depends(),  # FastAPI가 Depends()로 주입
    stock_mapper: StockMapper = Depends(),
):
    sentiment = await sentiment_service.analyze(request.content)
    stocks = await stock_mapper.extract_stocks(request.content)
    return SentimentResponse(
        sentiment_score=sentiment.score,
        confidence=sentiment.confidence,
        related_stocks=stocks,
    )
```

**⚠️ Key Rule:** `Depends()`는 함수 시그니처에만 사용하고, 모듈 전역에서는 직접 인스턴스를 생성하지 마세요.

---

## 3. Pydantic v2 Schemas

### 3.1 Request DTO

```python
# ✅ app/schemas/request.py
from pydantic import BaseModel, Field
from typing import List, Literal

class SentimentRequest(BaseModel):
    content: str = Field(..., min_length=1, description="뉴스 텍스트")
    source: str | None = Field(None, description="뉴스 출처")

class RecommendationRequest(BaseModel):
    user_id: int = Field(..., description="사용자 ID")
    risk_profile: Literal["conservative", "moderate", "aggressive"] = Field(
        ..., description="사용자 위험 성향"
    )
    preferred_sectors: List[str] = Field(default_factory=list, description="선호 섹터")
```

### 3.2 Response DTO

```python
# ✅ app/schemas/response.py
from pydantic import BaseModel, Field
from typing import List

class SentimentResponse(BaseModel):
    sentiment_score: float = Field(..., ge=-1.0, le=1.0, description="감성 점수 (-1.0 ~ 1.0)")
    confidence: float = Field(..., ge=0.0, le=1.0, description="신뢰도")
    related_stocks: List[dict] = Field(default_factory=list, description="관련 종목")

class StockRecommendation(BaseModel):
    ticker: str
    name: str
    risk_score: float = Field(..., ge=0.0, le=1.0)
    reason: str

class RecommendationResponse(BaseModel):
    user_id: int
    risk_profile: str
    recommendations: List[StockRecommendation] = Field(default_factory=list)
```

**⚠️ Key Rule:** Field 검증은 Pydantic v2 문법(`Field(..., ge=-1.0)`)을 사용합니다. v1의 `confloat` 등은 deprecated.

---

## 4. Configuration (pydantic-settings)

```python
# ✅ app/core/config.py
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parent.parent.parent / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # FastAPI
    APP_NAME: str = "stock-ai-server"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    # Infrastructure
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/stock_ai"
    REDIS_URL: str = "redis://localhost:6379/0"
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    SPRING_BOOT_URL: str = "http://localhost:8080"

    # AI Model
    MODEL_NAME: str = "snunlp/KR-FinBert-SC"
    MODEL_DEVICE: str = "cpu"

    # Security
    INTERNAL_API_KEY: str | None = None


settings = Settings()
```

**⚠️ Key Rule:** `.env` 파일은 반드시 `Path(__file__)` 기준 상대 경로로 지정하여 어디서 실행해도 동일하게 로드되게 합니다.

---

## 5. Exception Handling

### 5.1 Custom Exception Hierarchy

```python
# ✅ app/core/exceptions.py
from fastapi import Request, status
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger(__name__)

class BaseAppException(Exception):
    def __init__(self, message: str, status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)

class SentimentAnalysisException(BaseAppException):
    def __init__(self, message: str = "감성 분석 중 오류가 발생했습니다."):
        super().__init__(message, status.HTTP_500_INTERNAL_SERVER_ERROR)

class StockMappingException(BaseAppException):
    def __init__(self, message: str = "종목 매핑 중 오류가 발생했습니다."):
        super().__init__(message, status.HTTP_500_INTERNAL_SERVER_ERROR)

class RecommendationException(BaseAppException):
    def __init__(self, message: str = "추천 생성 중 오류가 발생했습니다."):
        super().__init__(message, status.HTTP_500_INTERNAL_SERVER_ERROR)
```

### 5.2 Global Handlers

```python
# ✅ app/core/exceptions.py (continued)

async def global_exception_handler(request: Request, exc: BaseAppException):
    logger.error(f"Unhandled exception: {exc.message}", exc_info=True)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message},
    )

async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unexpected error: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "서버 내부 오류가 발생했습니다."},
    )
```

**⚠️ Key Rule:** `HTTPException` 대신 **커스텀 예외 + global handler**를 사용하여 일관된 에러 응답 포맷을 유지합니다.

---

## 6. NLP Model Pattern (Singleton + Lazy Loading)

```python
# ✅ app/models/nlp_model.py
import logging
import random  # TODO: 실제 모델 로드 시 제거

logger = logging.getLogger(__name__)

class NLPModel:
    """
    Hugging Face 기반 NLP 모델 래퍼 (싱글톤)
    TODO: 실제 transformers 모델 로드 및 추론 구현
    """

    def __init__(self, model_name: str, device: str = "cpu"):
        self.model_name = model_name
        self.device = device
        self._loaded = False
        self._load_model()

    def _load_model(self):
        logger.info(f"Loading NLP model: {self.model_name} on {self.device}")
        # TODO: 실제 모델 로드 (예: transformers.AutoModel, AutoTokenizer)
        self._loaded = True
        logger.info("NLP model loaded successfully")

    def predict(self, text: str) -> tuple[float, float]:
        """
        감성 점수와 신뢰도를 반환
        Returns: (sentiment_score: -1.0 ~ 1.0, confidence: 0.0 ~ 1.0)
        """
        if not self._loaded:
            raise RuntimeError("Model is not loaded yet")
        # TODO: 실제 추론 로직
        score = round(random.uniform(-1.0, 1.0), 4)
        confidence = round(random.uniform(0.7, 1.0), 4)
        return score, confidence
```

### 6.1 Model Loading Best Practice

```python
# TODO: 실제 구현 시 아래와 같이 lifespan에서 로드하는 것을 권장
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 모델 로드 (비동기로 오래 걸리는 작업)
    await nlp_model.load_async()
    yield
    # 정리
    await nlp_model.unload()
```

**⚠️ Key Rule:** 모델은 서버 시작 시 **1회 로드**, 추론 시 **싱글톤 인스턴스**를 재사용합니다. 요청마다 로드 시 서버 터짐.

---

## 7. Async Service Pattern

### 7.1 Sentiment Service

```python
# ✅ app/services/sentiment_service.py
from dataclasses import dataclass
from app.models.nlp_model import NLPModel
from app.core.dependencies import get_nlp_model

@dataclass
class SentimentResult:
    score: float
    confidence: float

class SentimentService:
    def __init__(self, model: NLPModel = get_nlp_model()):
        self.model = model

    async def analyze(self, text: str) -> SentimentResult:
        # TODO: Redis 캐시 조회 (동일 텍스트 분석 방지)
        score, confidence = self.model.predict(text)
        return SentimentResult(score=score, confidence=confidence)
```

### 7.2 Recommendation Service

```python
# ✅ app/services/recommendation_service.py
from typing import List
from app.schemas.request import RecommendationRequest
from app.schemas.response import RecommendationResponse, StockRecommendation

class RecommendationService:
    async def recommend(self, request: RecommendationRequest) -> RecommendationResponse:
        # TODO: 실제 RiskScore 계산 및 사용자 매칭 로직
        dummy = [
            StockRecommendation(
                ticker="005930",
                name="삼성전자",
                risk_score=0.45,
                reason="안정적인 실적과 중립적 감성",
            ),
            StockRecommendation(
                ticker="000660",
                name="SK하이닉스",
                risk_score=0.72,
                reason="긍정적 감성과 높은 모멘텀",
            ),
        ]
        return RecommendationResponse(
            user_id=request.user_id,
            risk_profile=request.risk_profile,
            recommendations=dummy,
        )
```

**⚠️ Key Rule:** Service 계층의 모든 메서드는 **async**로 선언하여 FastAPI 비동기 처리 체계에 통합합니다.

---

## 8. Redis Caching Pattern

```python
# ✅ app/infrastructure/redis_client.py
import redis.asyncio as redis
import json
from app.core.config import settings

class RedisClient:
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self._client: redis.Redis | None = None

    async def connect(self):
        self._client = redis.from_url(self.redis_url, decode_responses=True)

    async def disconnect(self):
        if self._client:
            await self._client.close()

    async def get_sentiment(self, news_hash: str) -> dict | None:
        if not self._client:
            return None
        data = await self._client.get(f"sentiment:{news_hash}")
        return json.loads(data) if data else None

    async def set_sentiment(self, news_hash: str, result: dict, ttl: int = 3600):
        if self._client:
            await self._client.setex(f"sentiment:{news_hash}", ttl, json.dumps(result))
```

---

## 9. Testing Pattern (pytest + asyncio)

### 9.1 Service Test

```python
# ✅ tests/test_sentiment.py
import pytest
from app.services.sentiment_service import SentimentService
from app.models.nlp_model import NLPModel

@pytest.fixture
def mock_nlp_model():
    model = NLPModel("test-model", "cpu")
    return model

@pytest.fixture
def sentiment_service(mock_nlp_model):
    return SentimentService(model=mock_nlp_model)

@pytest.mark.asyncio
async def test_analyze_returns_sentiment_result(sentiment_service):
    result = await sentiment_service.analyze("삼성전자 실적 호조")
    assert isinstance(result.score, float)
    assert -1.0 <= result.score <= 1.0
    assert 0.0 <= result.confidence <= 1.0
```

### 9.2 API Test (TestClient)

```python
# ✅ tests/test_api.py
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_analyze_endpoint():
    response = client.post("/analyze", json={"content": "삼성전자 실적 호조"})
    assert response.status_code == 200
    data = response.json()
    assert "sentiment_score" in data
    assert -1.0 <= data["sentiment_score"] <= 1.0
```

---

## 10. Do's and Don'ts

### ✅ Do
- **모든 I/O 작업** (DB, HTTP, Kafka)은 `async/await`로 처리
- **Pydantic v2** 문법 사용 (`Field(..., ge=-1.0)`), v1 레거시 금지
- **FastAPI Depends**로 의존성 주입 — 모듈 전역 직접 생성 금지
- **커스텀 예외 + global handler** — `HTTPException` 직접 던지기 금지
- **lifespan**에서 무거운 리소스 초기화, `yield` 후 정리
- **Type Hint** 필수 — Python 3.10+ 문법 (`str | None`, `list[str]`)
- **Redis 캐시**로 동일 뉴스 재분석 방지 (TTL 설정)

### ❌ Don't
- `sync` 함수로 DB 호출 — `asyncpg` + SQLAlchemy async 세션 사용
- 요청마다 NLP 모델 로드/언로드 — 싱글톤 + lifespan 관리
- Pydantic v1 문법 (`confloat`, `validator` 데코레이터 등)
- `app = FastAPI()` 직접 생성 후 `on_event("startup")` 사용 — `lifespan` 사용
- `.env` 경로를 절대 경로로 하드코딩 — `Path(__file__)` 기준 상대 경로 사용
- Kafka Consumer를 동기 코드로 작성 — `aiokafka` 사용

---

## 11. Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `ModuleNotFoundError: app` | Python path 문제 | `uvicorn app.main:app --app-dir .` 또는 `PYTHONPATH=. uvicorn ...` |
| NLP 모델 로드 느림 | CPU에서 대용량 모델 로드 | `MODEL_DEVICE=cuda` 설정 또는 모델 양자화 검토 |
| Redis 연결 실패 | Docker 미실행 또는 포트 충돌 | `docker run -p 6379:6379 redis:alpine` |
| Pydantic validation error | v1/v2 문법 혼용 | `pydantic` import를 v2로 통일 (`from pydantic import Field`) |
| Kafka Consumer 미작동 | 토픽 미생성 | `docker exec kafka kafka-topics --create --topic news ...` |

---

> 본 문서는 `stock-ai-server` 내 **기술 패턴**을 다룹니다.
> 프로젝트 전체 맥락은 [AGENT.md](AGENT.md)를 참조하세요.
