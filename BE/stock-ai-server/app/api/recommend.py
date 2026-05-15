from fastapi import APIRouter, Depends
from app.schemas.request import RecommendationRequest
from app.schemas.response import RecommendationResponse
from app.services.recommendation_service import RecommendationService
from app.core.dependencies import get_recommendation_service

router = APIRouter(prefix="/recommend", tags=["Recommendation"])


@router.post("", response_model=RecommendationResponse)
async def recommend_stocks(
    request: RecommendationRequest,
    recommendation_service: RecommendationService = Depends(get_recommendation_service),
):
    return await recommendation_service.recommend(request)
