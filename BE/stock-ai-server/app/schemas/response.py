from pydantic import BaseModel, Field
from typing import List, Literal


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


# 신설 스키마
class StockNewsItem(BaseModel):
    title: str
    link: str
    source: str
    pubDate: str
    sentiment: Literal["positive", "negative", "neutral"]
    sentimentScore: float
    confidence: float


class StockAiAnalysisResponse(BaseModel):
    score: float
    signal: Literal["BUY", "HOLD", "SELL"]
    reason: str
    news: List[StockNewsItem] = Field(default_factory=list)


class DashboardStockItem(BaseModel):
    stockCode: str
    stockName: str
    price: float
    changeRate: float
    aiScore: float
    reason: str
    marketType: Literal["DOMESTIC", "OVERSEAS"]


class DashboardRecommendationsResponse(BaseModel):
    recommended: List[DashboardStockItem] = Field(default_factory=list)
    avoided: List[DashboardStockItem] = Field(default_factory=list)

