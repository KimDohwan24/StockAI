from typing import List
from app.schemas.request import RecommendationRequest
from app.schemas.response import RecommendationResponse, StockRecommendation


class RecommendationService:
    async def recommend(self, request: RecommendationRequest) -> RecommendationResponse:
        # TODO: 실제 RiskScore 계산 및 사용자 매칭 로직 구현
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
