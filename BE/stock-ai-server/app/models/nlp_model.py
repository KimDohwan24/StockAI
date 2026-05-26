import json
import logging
import random
import httpx
import asyncio
from app.core.config import settings

logger = logging.getLogger(__name__)

NLP_SEED = 42


class NLPModel:
    """
    OpenRouter LLM API 기반 NLP 모델 래퍼 (싱글톤)
    비동기 httpx 클라이언트를 사용해 뉴스 감성 점수 및 신뢰도를 계산합니다.
    API KEY가 설정되지 않은 경우 가상의 점수를 반환하는 Mock 모드로 자동 동작합니다.
    """

    def __init__(self, model_name: str, device: str = "cpu"):
        self.model_name = settings.OPENROUTER_MODEL
        self.api_key = settings.OPENROUTER_API_KEY
        self.device = device
        self._loaded = False
        random.seed(NLP_SEED)
        self._load_model()

    def _load_model(self):
        if not self.api_key:
            logger.warning(
                "OPENROUTER_API_KEY is not set in environment variables. "
                "NLPModel will operate in MOCK MODE (generating random values)."
            )
        else:
            logger.info(f"Using OpenRouter LLM API: {self.model_name}")
        self._loaded = True

    async def predict(self, text: str, model_name: str | None = None) -> tuple[float, float]:
        """
        감성 점수와 신뢰도를 반환 (비동기)
        Returns:
            (sentiment_score: -1.0 ~ 1.0, confidence: 0.0 ~ 1.0)
        """
        if not self._loaded:
            raise RuntimeError("Model is not loaded yet")

        target_model = model_name or self.model_name

        if not self.api_key:
            # Mock mode fallback (시드 고정으로 재현 가능)
            score = round(random.uniform(-1.0, 1.0), 4)
            confidence = round(random.uniform(0.7, 1.0), 4)
            return score, confidence

        # OpenRouter API call
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:8000",
            "X-Title": "StockAI Gateway",
        }
        
        system_prompt = (
            "당신은 금융 뉴스 감성 분석 전문가입니다.\n"
            "제시된 금융 뉴스 텍스트를 분석하여 이 뉴스가 관련 주식 시장에 미칠 영향을 -1.0(매우 부정)에서 1.0(매우 긍정) 사이의 실수 점수로 평가하고, "
            "분석의 신뢰도를 0.0(낮음)에서 1.0(높음) 사이로 평가하세요.\n\n"
            "출력 형식은 오직 아래와 같은 JSON 형식이어야 하며, 다른 서론, 설명, 마크다운(예: ```json 등)은 절대 포함하지 마십시오:\n"
            '{"score": 0.8, "confidence": 0.95}'
        )

        payload = {
            "model": target_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text}
            ],
            "response_format": {"type": "json_object"}
        }

        try:
            logger.info(f"Calling OpenRouter API with model: {target_model}")
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                
                content = data["choices"][0]["message"]["content"].strip()
                # Clean up any potential markdown wraps in response
                if content.startswith("```"):
                    content = content.replace("```json", "").replace("```", "").strip()
                
                result = json.loads(content)
                score = float(result.get("score", 0.0))
                confidence = float(result.get("confidence", 0.8))
                
                # Clamp values just in case
                score = max(-1.0, min(1.0, score))
                confidence = max(0.0, min(1.0, confidence))
                
                return score, confidence
        except Exception as e:
            logger.error(f"OpenRouter API call failed for model {target_model}: {str(e)}. Falling back to mock prediction.")
            score = round(random.uniform(-1.0, 1.0), 4)
            confidence = round(random.uniform(0.7, 1.0), 4)
            return score, confidence

    async def predict_batch(self, texts: list[str], model_name: str | None = None) -> list[tuple[float, float]]:
        """
        여러 텍스트의 감성 점수와 신뢰도를 비동기로 병렬 처리하여 반환
        Returns:
            list[tuple[sentiment_score, confidence]]
        """
        if not self._loaded:
            raise RuntimeError("Model is not loaded yet")

        # Gather predictions concurrently for high speed
        tasks = [self.predict(text, model_name) for text in texts]
        return await asyncio.gather(*tasks)
