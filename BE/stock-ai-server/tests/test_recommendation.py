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
