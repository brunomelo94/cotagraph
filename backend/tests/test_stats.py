import pytest


@pytest.mark.asyncio
async def test_stats_summary_returns_expected_shape(client):
    resp = await client.get("/api/v1/stats/summary")

    assert resp.status_code == 200
    data = resp.json()
    assert "total_deputies" in data
    assert "total_beneficiaries" in data
    assert "total_amendments_brl" in data
    assert "latest_amendment_year" in data
    assert "last_sync_at" in data

    assert isinstance(data["total_deputies"], int)
    assert isinstance(data["total_beneficiaries"], int)
    assert isinstance(data["total_amendments_brl"], (int, float))
    assert data["total_deputies"] > 0
    assert data["total_amendments_brl"] > 0
