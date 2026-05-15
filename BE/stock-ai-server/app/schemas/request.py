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
