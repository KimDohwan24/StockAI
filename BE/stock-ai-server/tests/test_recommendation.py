import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_recommend_stocks():
    payload = {
        "user_id": 1,
        "risk_profile": "moderate",
        "preferred_sectors": ["반도체", "IT"],
    }
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post("/recommend", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == 1
    assert data["risk_profile"] == "moderate"
    assert isinstance(data["recommendations"], list)


@pytest.mark.asyncio
async def test_recommend_analysis():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/v1/recommend/analysis?ticker=005930")
    assert response.status_code == 200
    data = response.json()
    assert "score" in data
    assert "signal" in data
    assert "reason" in data
    assert isinstance(data["news"], list)


@pytest.mark.asyncio
async def test_recommend_dashboard():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/v1/recommend/dashboard?market=domestic")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["recommended"], list)
    assert isinstance(data["avoided"], list)

