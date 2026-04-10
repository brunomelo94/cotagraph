import pytest


# --- top-spenders ---


@pytest.mark.asyncio
async def test_top_spenders_returns_expected_shape(client):
    resp = await client.get("/api/v1/graph/top-spenders")

    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert isinstance(data["items"], list)
    assert len(data["items"]) > 0

    item = data["items"][0]
    assert "camara_id" in item
    assert "name" in item
    assert "party" in item
    assert "state" in item
    assert "total_brl" in item
    assert "graph_id" in item
    assert item["graph_id"].startswith("deputy_")


@pytest.mark.asyncio
async def test_top_spenders_respects_limit(client):
    resp = await client.get("/api/v1/graph/top-spenders", params={"limit": 5})
    data = resp.json()

    assert len(data["items"]) <= 5


@pytest.mark.asyncio
async def test_top_spenders_sorted_descending(client):
    resp = await client.get("/api/v1/graph/top-spenders", params={"limit": 10})
    items = resp.json()["items"]

    totals = [i["total_brl"] for i in items]
    assert totals == sorted(totals, reverse=True)


# --- subgraph ---


@pytest.mark.asyncio
async def test_subgraph_deputy_returns_cytoscape_shape(client):
    # Get a real deputy graph_id from top-spenders
    top = await client.get("/api/v1/graph/top-spenders", params={"limit": 1})
    graph_id = top.json()["items"][0]["graph_id"]

    resp = await client.get(f"/api/v1/graph/{graph_id}")

    assert resp.status_code == 200
    data = resp.json()
    assert data["center_id"] == graph_id
    assert "nodes" in data
    assert "edges" in data
    assert len(data["nodes"]) > 0

    node = data["nodes"][0]
    assert "data" in node
    assert "id" in node["data"]
    assert "label" in node["data"]
    assert "type" in node["data"]


@pytest.mark.asyncio
async def test_subgraph_respects_max_nodes(client):
    top = await client.get("/api/v1/graph/top-spenders", params={"limit": 1})
    graph_id = top.json()["items"][0]["graph_id"]

    resp = await client.get(f"/api/v1/graph/{graph_id}", params={"max_nodes": 5})
    data = resp.json()

    assert len(data["nodes"]) <= 5


@pytest.mark.asyncio
async def test_subgraph_edges_reference_existing_nodes(client):
    top = await client.get("/api/v1/graph/top-spenders", params={"limit": 1})
    graph_id = top.json()["items"][0]["graph_id"]

    resp = await client.get(f"/api/v1/graph/{graph_id}", params={"max_nodes": 20})
    data = resp.json()

    node_ids = {n["data"]["id"] for n in data["nodes"]}
    for edge in data["edges"]:
        assert edge["data"]["source"] in node_ids
        assert edge["data"]["target"] in node_ids
