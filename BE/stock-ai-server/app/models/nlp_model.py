import random
import logging

logger = logging.getLogger(__name__)

NLP_SEED = 42


class NLPModel:
    """
    Hugging Face 기반 NLP 모델 래퍼 (싱글톤)
    TODO: 실제 transformers 모델 로드 및 추론 구현
    """

    def __init__(self, model_name: str, device: str = "cpu"):
        self.model_name = model_name
        self.device = device
        self._loaded = False
        random.seed(NLP_SEED)
        self._load_model()

    def _load_model(self):
        logger.info(f"Loading NLP model: {self.model_name} on {self.device}")
        # TODO: 실제 모델 로드
        self._loaded = True
        logger.info("NLP model loaded successfully")

    def predict(self, text: str) -> tuple[float, float]:
        """
        감성 점수와 신뢰도를 반환
        Returns:
            (sentiment_score: -1.0 ~ 1.0, confidence: 0.0 ~ 1.0)
        """
        if not self._loaded:
            raise RuntimeError("Model is not loaded yet")
        # TODO: 실제 추론 로직
        # 임시 랜덤 값 반환 (시드 고정으로 재현 가능)
        score = round(random.uniform(-1.0, 1.0), 4)
        confidence = round(random.uniform(0.7, 1.0), 4)
        return score, confidence

    def predict_batch(self, texts: list[str]) -> list[tuple[float, float]]:
        """
        여러 텍스트의 감성 점수와 신뢰도를 일괄 반환
        Returns:
            list[tuple[sentiment_score, confidence]]
        """
        if not self._loaded:
            raise RuntimeError("Model is not loaded yet")
        # TODO: 실제 일괄 추론 로직 (배치 토크나이징 및 배치 추론)
        results = []
        for _ in texts:
            score = round(random.uniform(-1.0, 1.0), 4)
            confidence = round(random.uniform(0.7, 1.0), 4)
            results.append((score, confidence))
        return results
