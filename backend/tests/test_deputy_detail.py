import pytest


@pytest.mark.asyncio
async def test_deputy_detail_returns_expected_shape(client):
    # First get a real camara_id from the list endpoint
    list_resp = await client.get("/api/v1/deputies", params={"limit": 1})
    camara_id = list_resp.json()["items"][0]["camara_id"]

    resp = await client.get(f"/api/v1/deputies/{camara_id}")

    assert resp.status_code == 200
    data = resp.json()
    assert data["camara_id"] == camara_id
    assert "name" in data
    assert "party" in data
    assert "state" in data
    assert "stats" in data

    stats = data["stats"]
    assert "total_amendments_brl" in stats
    assert "amendment_count" in stats
    assert isinstance(stats["total_amendments_brl"], (int, float))
    assert isinstance(stats["amendment_count"], int)


@pytest.mark.asyncio
async def test_deputy_detail_not_found(client):
    resp = await client.get("/api/v1/deputies/99999999")

    assert resp.status_code == 404
    data = resp.json()
    assert "detail" in data or "title" in data
