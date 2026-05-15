from fastapi import APIRouter, Depends
from app.schemas.request import SentimentRequest
from app.schemas.response import SentimentResponse
from app.services.sentiment_service import SentimentService
from app.services.stock_mapper import StockMapper
from app.core.dependencies import get_sentiment_service, get_stock_mapper

router = APIRouter(prefix="/analyze", tags=["Sentiment Analysis"])


@router.post("", response_model=SentimentResponse)
async def analyze_news(
    request: SentimentRequest,
    sentiment_service: SentimentService = Depends(get_sentiment_service),
    stock_mapper: StockMapper = Depends(get_stock_mapper),
):
    sentiment = await sentiment_service.analyze(request.content)
    stocks = await stock_mapper.extract_stocks(request.content)
    return SentimentResponse(
        sentiment_score=sentiment.score,
        confidence=sentiment.confidence,
        related_stocks=stocks,
    )
