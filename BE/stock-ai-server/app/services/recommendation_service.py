from typing import List
from app.schemas.request import RecommendationRequest
from app.schemas.response import RecommendationResponse, StockRecommendation


RISK_PROFILE_STOCKS = {
    "conservative": [
        {"ticker": "005930", "name": "삼성전자"},
        {"ticker": "005380", "name": "현대차"},
    ],
    "moderate": [
        {"ticker": "000660", "name": "SK하이닉스"},
        {"ticker": "035420", "name": "네이버"},
    ],
    "aggressive": [
        {"ticker": "373220", "name": "LG에너지솔루션"},
        {"ticker": "068270", "name": "셀트리온"},
    ],
}

DEFAULT_RISK_SCORES = {
    "conservative": 0.3,
    "moderate": 0.6,
    "aggressive": 0.8,
}


class RecommendationService:
    async def recommend(self, request: RecommendationRequest) -> RecommendationResponse:
        risk_profile = request.risk_profile or "moderate"
        stocks = RISK_PROFILE_STOCKS.get(risk_profile, RISK_PROFILE_STOCKS["moderate"])
        base_score = DEFAULT_RISK_SCORES.get(risk_profile, 0.5)

        recommendations = [
            StockRecommendation(
                ticker=stock["ticker"],
                name=stock["name"],
                risk_score=base_score,
                reason=f"{risk_profile} 프로필에 매칭되는 종목",
            )
            for stock in stocks
        ]
        return RecommendationResponse(
            user_id=request.user_id,
            risk_profile=risk_profile,
            recommendations=recommendations,
        )
