import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_health_check():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_analyze_news():
    payload = {"content": "삼성전자 실적이 예상보다 호전되었습니다."}
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post("/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "sentiment_score" in data
    assert "confidence" in data
    assert "related_stocks" in data
