from typing import AsyncGenerator

from app.infrastructure.database import AsyncSessionLocal
from app.infrastructure.redis_client import RedisClient
from app.models.nlp_model import NLPModel
from app.core.config import settings
from app.services.sentiment_service import SentimentService
from app.services.recommendation_service import RecommendationService
from app.services.stock_mapper import StockMapper

redis_client: RedisClient = RedisClient(settings.REDIS_URL)
_nlp_model: NLPModel | None = None


async def get_db() -> AsyncGenerator:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


def get_redis() -> RedisClient:
    return redis_client


def get_nlp_model() -> NLPModel:
    global _nlp_model
    if _nlp_model is None:
        _nlp_model = NLPModel(settings.MODEL_NAME, settings.MODEL_DEVICE)
    return _nlp_model


def get_sentiment_service() -> SentimentService:
    return SentimentService(model=get_nlp_model())


def get_stock_mapper() -> StockMapper:
    return StockMapper()


def get_recommendation_service() -> RecommendationService:
    return RecommendationService()
