import pytest


@pytest.mark.asyncio
async def test_deputy_amendments_returns_expected_shape(client):
    list_resp = await client.get("/api/v1/deputies", params={"limit": 1})
    camara_id = list_resp.json()["items"][0]["camara_id"]

    resp = await client.get(f"/api/v1/deputies/{camara_id}/amendments")

    assert resp.status_code == 200
    data = resp.json()
    assert "total" in data
    assert "items" in data
    assert isinstance(data["items"], list)

    if data["total"] > 0:
        item = data["items"][0]
        assert "amendment_code" in item
        assert "beneficiary_name" in item
        assert "amount_brl" in item
        assert "year" in item


@pytest.mark.asyncio
async def test_deputy_amendments_respects_limit(client):
    list_resp = await client.get("/api/v1/deputies", params={"limit": 1})
    camara_id = list_resp.json()["items"][0]["camara_id"]

    resp = await client.get(f"/api/v1/deputies/{camara_id}/amendments", params={"limit": 3})
    data = resp.json()

    assert len(data["items"]) <= 3


@pytest.mark.asyncio
async def test_deputy_amendments_filter_by_year(client):
    list_resp = await client.get("/api/v1/deputies", params={"limit": 1})
    camara_id = list_resp.json()["items"][0]["camara_id"]

    resp = await client.get(f"/api/v1/deputies/{camara_id}/amendments", params={"year": 2024})

    assert resp.status_code == 200
    for item in resp.json()["items"]:
        assert item["year"] == 2024


@pytest.mark.asyncio
async def test_deputy_amendments_not_found(client):
    resp = await client.get("/api/v1/deputies/99999999/amendments")
    assert resp.status_code == 404
