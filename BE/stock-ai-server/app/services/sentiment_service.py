from dataclasses import dataclass
from app.models.nlp_model import NLPModel


@dataclass
class SentimentResult:
    score: float
    confidence: float


class SentimentService:
    def __init__(self, model: NLPModel | None = None):
        self.model = model

    async def analyze(self, text: str) -> SentimentResult:
        if self.model is None:
            raise RuntimeError("NLPModel is not provided to SentimentService")
        score, confidence = await self.model.predict(text)
        return SentimentResult(score=score, confidence=confidence)

    async def analyze_batch(self, texts: list[str], model_name: str | None = None) -> list[SentimentResult]:
        if self.model is None:
            raise RuntimeError("NLPModel is not provided to SentimentService")
        # Use batch predict to optimize performance
        predictions = await self.model.predict_batch(texts, model_name)
        return [SentimentResult(score=score, confidence=confidence) for score, confidence in predictions]
