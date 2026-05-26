import logging
import httpx
import random
from app.core.config import settings
from app.schemas.request import RecommendationRequest
from app.schemas.response import StockAiAnalysisResponse, DashboardRecommendationsResponse, RecommendationResponse, StockRecommendation

logger = logging.getLogger(__name__)

DOMESTIC_STOCKS = {
    "005930": "삼성전자",
    "000660": "SK하이닉스",
    "035420": "네이버",
    "035720": "카카오",
    "005380": "현대차",
    "373220": "LG에너지솔루션",
    "068270": "셀트리온",
    "000270": "기아",
}

OVERSEAS_STOCKS = {
    "AAPL": "애플",
    "TSLA": "테슬라",
    "MSFT": "마이크로소프트",
    "NVDA": "엔비디아",
    "AMZN": "아마존",
    "GOOGL": "구글",
    "META": "메타",
    "NFLX": "넷플릭스",
}

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
    def __init__(self, news_service=None, sentiment_service=None):
        self._news_service = news_service
        self._sentiment_service = sentiment_service

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

    @property
    def news_service(self):
        if self._news_service is None:
            from app.core.dependencies import get_news_service
            self._news_service = get_news_service()
        return self._news_service

    @property
    def sentiment_service(self):
        if self._sentiment_service is None:
            from app.core.dependencies import get_sentiment_service
            self._sentiment_service = get_sentiment_service()
        return self._sentiment_service

    async def _get_live_stock_info(self, ticker: str) -> tuple[float, float]:
        """
        Spring Boot Core API에서 실시간 시세를 조회합니다.
        실패시 안정적으로 결정론적인 가짜(Mock) 시세 데이터를 생성하여 반환합니다.
        """
        is_domestic = ticker.isdigit()
        spring_url = settings.SPRING_BOOT_URL or "http://localhost:8080"

        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                if is_domestic:
                    url = f"{spring_url}/api/stocks/{ticker}/price"
                    res = await client.get(url)
                    if res.status_code == 200:
                        data = res.json()
                        price = float(data.get("stck_prpr", 0.0) or 0.0)
                        change_rate = float(data.get("prdy_ctrt", 0.0) or 0.0)
                        return price, change_rate
                else:
                    # 해외 주식의 경우 NAS 거래소 우선 조회
                    url = f"{spring_url}/api/overseas-stocks/{ticker}/price?exchange=NAS"
                    res = await client.get(url)
                    if res.status_code == 200:
                        data = res.json()
                        # OverseasStockPriceResponse 파싱
                        last_price = data.get("last") or data.get("clos")
                        if last_price:
                            price = float(last_price)
                            clos = data.get("clos")
                            if clos and float(clos) > 0:
                                change_rate = (price - float(clos)) / float(clos) * 100
                            else:
                                change_rate = 0.0
                            return price, change_rate
        except Exception as e:
            logger.warning(f"Failed to fetch live price for {ticker}: {str(e)}")

        # Fallback Mock 데이터 생성 (결정론적 난수)
        seed = sum(ord(c) for c in ticker)
        rng = random.Random(seed)
        price = rng.uniform(50000.0, 150000.0) if is_domestic else rng.uniform(100.0, 300.0)
        price = round(price, 0 if is_domestic else 2)
        change_rate = round(rng.uniform(-5.0, 5.0), 2)
        return price, change_rate

    def _generate_reasoning(self, name: str, score: float, signal: str, avg_sentiment: float, change_rate: float, news_count: int) -> str:
        """
        뉴스 여론 및 시세 변동을 조합하여 AI 분석 리포트 코멘트를 한국어로 정교하게 자동 생성합니다.
        """
        sentiment_str = "긍정적" if avg_sentiment > 0.05 else ("부정적" if avg_sentiment < -0.05 else "중립적")
        sentiment_desc = f"최근 수집된 {news_count}개의 관련 뉴스는 대체로 {sentiment_str}인 흐름(평균 감성 지수 {avg_sentiment:+.2f})을 보입니다."
        if news_count == 0:
            sentiment_desc = "최근 관련 뉴스가 충분히 보도되지 않아 시장 여론은 중립적인 상태입니다."

        price_trend = "상승세" if change_rate > 0 else ("하락세" if change_rate < 0 else "보합세")
        price_desc = f"금일 주가는 전일 대비 {change_rate:+.2f}%의 {price_trend}를 나타내어 "
        if change_rate > 1.5:
            price_desc += "견고한 매수세가 지지되고 있습니다."
        elif change_rate < -1.5:
            price_desc += "단기적인 차익 매물 압력이 높은 상황입니다."
        else:
            price_desc += "큰 가격 변동 없이 박스권 횡보를 보여주고 있습니다."

        if signal == "BUY":
            summary = f"**[AI 신호: 매수(BUY)]** {name} 종목은 긍정적인 여론과 양호한 시장 흐름이 결합된 상태입니다. {sentiment_desc} {price_desc} 종합 점수 {score:+.1f}점으로 신규 매수 및 보유가 유리할 것으로 보입니다."
        elif signal == "SELL":
            summary = f"**[AI 신호: 매도(SELL)]** {name} 종목은 하방 압력이 누적되는 흐름을 보이고 있습니다. {sentiment_desc} {price_desc} 종합 점수 {score:+.1f}점으로 리스크 관리를 위한 매도 혹은 비중 축소를 추천합니다."
        else:
            summary = f"**[AI 신호: 관망(HOLD)]** {name} 종목은 관망세가 우세한 구간입니다. {sentiment_desc} {price_desc} 종합 점수 {score:+.1f}점으로 뚜렷한 모멘텀이 나타날 때까지 포지션을 유지하며 추이를 지켜보는 것이 바람직합니다."

        return summary

    async def get_ai_signal(self, ticker: str, model_name: str | None = None, stock_name: str | None = None) -> dict:
        """
        종목 코드로 실시간 뉴스를 검색하고 감성을 평가하여 AI 투자 점수 및 상세 분석을 산출합니다.
        """
        # 1. 한글 종목명 매핑
        if not stock_name:
            is_domestic = ticker.isdigit()
            if is_domestic:
                stock_name = DOMESTIC_STOCKS.get(ticker, ticker)
            else:
                stock_name = OVERSEAS_STOCKS.get(ticker, ticker)

        # 2. 뉴스 검색
        news_list = await self.news_service.search_news(stock_name, limit=10)
        if not news_list and stock_name != ticker:
            news_list = await self.news_service.search_news(ticker, limit=10)

        # 3. 감성 분석
        sentiment_news = []
        avg_sentiment = 0.0

        if news_list:
            texts = [n["description"] or n["title"] for n in news_list]
            s_results = await self.sentiment_service.analyze_batch(texts, model_name)

            total_score = 0.0
            for item, s_res in zip(news_list, s_results):
                score = s_res.score
                confidence = s_res.confidence

                if score > 0.05:
                    label = "positive"
                elif score < -0.05:
                    label = "negative"
                else:
                    label = "neutral"

                sentiment_news.append({
                    "title": item["title"],
                    "link": item["link"],
                    "source": item["source"],
                    "pubDate": item["pubDate"],
                    "sentiment": label,
                    "sentimentScore": score,
                    "confidence": confidence
                })
                total_score += score
            avg_sentiment = total_score / len(news_list)

        # 4. 실시간 가격 및 변동률 획득
        price, change_rate = await self._get_live_stock_info(ticker)

        # 5. AI 지수 계산
        # 감성 가중치 70%, 시장 변동률 가중치 30%
        # 변동률은 -10% ~ +10% 범위를 -100 ~ 100 점수로 환산
        sentiment_part = avg_sentiment * 100 * 0.70
        clamped_change = min(max(change_rate, -10.0), 10.0)
        momentum_part = clamped_change * 10.0 * 0.30

        final_score = sentiment_part + momentum_part
        final_score = max(min(final_score, 100.0), -100.0)
        final_score = round(final_score, 1)

        # 6. 신호 결정
        if final_score >= 20.0:
            signal = "BUY"
        elif final_score <= -20.0:
            signal = "SELL"
        else:
            signal = "HOLD"

        # 7. 판단 근거 한글 텍스트 작성
        reason = self._generate_reasoning(
            name=stock_name,
            score=final_score,
            signal=signal,
            avg_sentiment=avg_sentiment,
            change_rate=change_rate,
            news_count=len(news_list)
        )

        return {
            "score": final_score,
            "signal": signal,
            "reason": reason,
            "news": sentiment_news
        }

    async def get_dashboard_recommendations(self, market: str) -> dict:
        """
        시장(국내/해외)별 전체 주식을 평가하여 대시보드용 추천 3종목, 회피 3종목을 추출합니다.
        """
        is_domestic = (market.lower() == "domestic")
        stocks_to_analyze = DOMESTIC_STOCKS if is_domestic else OVERSEAS_STOCKS

        all_results = []
        for ticker, name in stocks_to_analyze.items():
            info = await self.get_ai_signal(ticker)
            price, change_rate = await self._get_live_stock_info(ticker)

            all_results.append({
                "stockCode": ticker,
                "stockName": name,
                "price": price,
                "changeRate": change_rate,
                "aiScore": info["score"],
                "reason": info["reason"],
                "marketType": "DOMESTIC" if is_domestic else "OVERSEAS"
            })

        # 점수 기준 정렬
        recommended = sorted(all_results, key=lambda x: x["aiScore"], reverse=True)[:3]
        avoided = sorted(all_results, key=lambda x: x["aiScore"])[:3]

        return {
            "recommended": recommended,
            "avoided": avoided
        }
