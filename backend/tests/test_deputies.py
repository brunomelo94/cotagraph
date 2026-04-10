import pytest


@pytest.mark.asyncio
async def test_deputies_list_returns_expected_shape(client):
    resp = await client.get("/api/v1/deputies")

    assert resp.status_code == 200
    data = resp.json()
    assert "total" in data
    assert "items" in data
    assert isinstance(data["total"], int)
    assert isinstance(data["items"], list)
    assert data["total"] > 0
    assert len(data["items"]) > 0

    deputy = data["items"][0]
    assert "camara_id" in deputy
    assert "name" in deputy
    assert "party" in deputy
    assert "state" in deputy
    assert "total_amendments_brl" in deputy


@pytest.mark.asyncio
async def test_deputies_list_default_limit_is_50(client):
    resp = await client.get("/api/v1/deputies")
    data = resp.json()

    assert len(data["items"]) <= 50


@pytest.mark.asyncio
async def test_deputies_list_respects_limit(client):
    resp = await client.get("/api/v1/deputies", params={"limit": 5})
    data = resp.json()

    assert len(data["items"]) <= 5


@pytest.mark.asyncio
async def test_deputies_list_filter_by_party(client):
    resp = await client.get("/api/v1/deputies", params={"party": "PT"})
    data = resp.json()

    assert resp.status_code == 200
    for deputy in data["items"]:
        assert deputy["party"] == "PT"


@pytest.mark.asyncio
async def test_deputies_list_filter_by_state(client):
    resp = await client.get("/api/v1/deputies", params={"state": "SP"})
    data = resp.json()

    assert resp.status_code == 200
    for deputy in data["items"]:
        assert deputy["state"] == "SP"


@pytest.mark.asyncio
async def test_deputies_list_pagination_offset(client):
    page1 = await client.get("/api/v1/deputies", params={"limit": 5, "offset": 0})
    page2 = await client.get("/api/v1/deputies", params={"limit": 5, "offset": 5})

    ids1 = {d["camara_id"] for d in page1.json()["items"]}
    ids2 = {d["camara_id"] for d in page2.json()["items"]}
    assert ids1.isdisjoint(ids2)
