from fastapi import APIRouter, Depends, Query, HTTPException
from app.schemas.response import StockAiAnalysisResponse, DashboardRecommendationsResponse
from app.services.recommendation_service import RecommendationService
from app.core.dependencies import get_recommendation_service, get_redis
from app.infrastructure.redis_client import RedisClient
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/recommend", tags=["AI Recommendations"])

@router.get("/analysis", response_model=StockAiAnalysisResponse)
async def get_analysis(
    ticker: str = Query(..., min_length=1),
    name: str | None = Query(None),
    model: str | None = Query(None),
    recommendation_service: RecommendationService = Depends(get_recommendation_service),
    redis: RedisClient = Depends(get_redis)
):
    cache_key = f"ai::analysis::{ticker}::{model}" if model else f"ai::analysis::{ticker}"
    try:
        cached = await redis.get(cache_key)
        if cached:
            logger.info(f"Cache hit for analysis: {ticker} (model={model})")
            return cached
    except Exception as e:
        logger.warning(f"Redis get failed for key {cache_key}: {str(e)}")

    try:
        result = await recommendation_service.get_ai_signal(ticker, model, name)
        try:
            # 60초 캐싱 (상세 페이지 호출 병목 분산용)
            await redis.set(cache_key, result, ttl=60)
        except Exception as e:
            logger.warning(f"Redis set failed for key {cache_key}: {str(e)}")
        return result
    except Exception as e:
        logger.error(f"Failed to calculate AI analysis for {ticker}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/news/search")
async def search_general_news(
    query: str = Query(..., min_length=1),
    limit: int = Query(20),
    recommendation_service: RecommendationService = Depends(get_recommendation_service),
):
    try:
        news_list = await recommendation_service.news_service.search_news(query, limit=limit)
        return news_list
    except Exception as e:
        logger.error(f"Failed to search news for query {query}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard", response_model=DashboardRecommendationsResponse)
async def get_dashboard(
    market: str = Query(..., pattern="^(domestic|overseas)$"),
    recommendation_service: RecommendationService = Depends(get_recommendation_service),
    redis: RedisClient = Depends(get_redis)
):
    cache_key = f"ai::dashboard::{market}"
    try:
        cached = await redis.get(cache_key)
        if cached:
            logger.info(f"Cache hit for dashboard: {market}")
            return cached
    except Exception as e:
        logger.warning(f"Redis get failed for key {cache_key}: {str(e)}")

    try:
        result = await recommendation_service.get_dashboard_recommendations(market)
        try:
            # 대시보드는 무거운 연산이므로 30분(1800초) 캐싱
            await redis.set(cache_key, result, ttl=1800)
        except Exception as e:
            logger.warning(f"Redis set failed for key {cache_key}: {str(e)}")
        return result
    except Exception as e:
        logger.error(f"Failed to generate dashboard recommendations for {market}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
