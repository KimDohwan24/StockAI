import re
from typing import List


class StockMapper:
    # 간단한 종목 매핑 키워드 예시 (추후 확장)
    KEYWORD_MAP = {
        "삼성전자": "005930",
        "SK하이닉스": "000660",
        "네이버": "035420",
        "카카오": "035720",
        "현대차": "005380",
        "LG에너지솔루션": "373220",
        "셀트리온": "068270",
        "기아": "000270",
    }

    async def extract_stocks(self, text: str) -> List[str]:
        matched = []
        for keyword, ticker in self.KEYWORD_MAP.items():
            if keyword in text or ticker in text:
                matched.append({"name": keyword, "ticker": ticker})
        return matched
