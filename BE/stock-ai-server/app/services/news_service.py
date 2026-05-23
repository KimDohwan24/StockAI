import re
import html
import logging
from urllib.parse import urlparse
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

class NewsService:
    def __init__(self):
        self.client_id = settings.NAVER_CLIENT_ID
        self.client_secret = settings.NAVER_CLIENT_SECRET
        self.search_url = "https://openapi.naver.com/v1/search/news.json"

    def _clean_html(self, text: str) -> str:
        if not text:
            return ""
        # HTML unescape first
        text = html.unescape(text)
        # Strip HTML tags
        text = re.sub(r'<[^>]*>', '', text)
        return text.strip()

    def _extract_source(self, link: str) -> str:
        if not link:
            return "네이버뉴스"
        try:
            domain = urlparse(link).netloc
            if domain.startswith("www."):
                domain = domain[4:]
            
            mapping = {
                "news.naver.com": "네이버뉴스",
                "hankyung.com": "한국경제",
                "mk.co.kr": "매일경제",
                "fnnews.com": "파이낸셜뉴스",
                "sedaily.com": "서울경제",
                "chosun.com": "조선일보",
                "donga.com": "동아일보",
                "joins.com": "중앙일보",
                "khan.co.kr": "경향신문",
                "hani.co.kr": "한겨레",
                "moneytoday.co.kr": "머니투데이",
                "mt.co.kr": "머니투데이",
                "edaily.co.kr": "이데일리",
                "asiae.co.kr": "아시아경제",
                "yonhapnews.co.kr": "연합뉴스",
                "yna.co.kr": "연합뉴스",
                "biz.chosun.com": "조선비즈",
                "seoul.co.kr": "서울신문",
                "kmib.co.kr": "국민일보",
                "munhwa.com": "문화일보",
                "segye.com": "세계일보"
            }
            for k, v in mapping.items():
                if k in domain:
                    return v
            return domain
        except Exception:
            return "뉴스"

    async def search_news(self, keyword: str, limit: int = 10) -> list[dict]:
        """
        네이버 뉴스 API를 통해 키워드로 뉴스를 검색합니다.
        """
        if not self.client_id or not self.client_secret:
            logger.warning("NAVER_CLIENT_ID or NAVER_CLIENT_SECRET is missing. Returning empty news.")
            return []

        headers = {
            "X-Naver-Client-Id": self.client_id,
            "X-Naver-Client-Secret": self.client_secret
        }
        params = {
            "query": keyword,
            "display": limit,
            "sort": "date"  # 최신 뉴스 우선
        }

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(self.search_url, headers=headers, params=params)
                if response.status_code != 200:
                    logger.error(f"Naver News API error: {response.status_code} - {response.text}")
                    return []
                
                data = response.json()
                items = data.get("items", [])
                
                news_list = []
                for item in items:
                    # originallink가 있으면 original source를 우선 사용
                    link = item.get("originallink") or item.get("link", "")
                    news_list.append({
                        "title": self._clean_html(item.get("title", "")),
                        "link": link,
                        "description": self._clean_html(item.get("description", "")),
                        "pubDate": item.get("pubDate", ""),
                        "source": self._extract_source(link)
                    })
                return news_list
        except Exception as e:
            logger.error(f"Failed to search news: {str(e)}")
            return []
