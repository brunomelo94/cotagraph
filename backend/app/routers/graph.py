from fastapi import APIRouter, Depends, HTTPException, Query

from app.dependencies import get_neo4j

router = APIRouter(prefix="/graph", tags=["graph"])


@router.get("/top-spenders")
async def top_spenders(
    year: int | None = None,
    limit: int = Query(default=20, ge=1, le=50),
    neo4j=Depends(get_neo4j),
):
    if year:
        query = """
            MATCH (d:Deputy)-[r:SENT_AMENDMENT {year: $year}]->(b:Beneficiary)
            RETURN d.camara_id AS camara_id, d.name AS name, d.party AS party,
                   COALESCE(d.state, '') AS state, sum(r.amount_brl) AS total_brl
            ORDER BY total_brl DESC LIMIT $limit
        """
        result = await neo4j.run(query, year=year, limit=limit)
    else:
        query = """
            MATCH (d:Deputy)-[r:SENT_AMENDMENT]->(b:Beneficiary)
            RETURN d.camara_id AS camara_id, d.name AS name, d.party AS party,
                   COALESCE(d.state, '') AS state, sum(r.amount_brl) AS total_brl
            ORDER BY total_brl DESC LIMIT $limit
        """
        result = await neo4j.run(query, limit=limit)

    records = await result.data()

    items = [
        {
            "camara_id": r["camara_id"],
            "name": r["name"],
            "party": r["party"],
            "state": r["state"],
            "total_brl": r["total_brl"],
            "graph_id": f"deputy_{r['camara_id']}",
        }
        for r in records
    ]

    return {"items": items}


def _parse_entity_id(entity_id: str) -> tuple[str, str | None, str | int | dict]:
    """Return (label, key_prop, key_value) from an entity_id like deputy_4497.

    For municipality, key_prop is None and key_value is {"uf": ..., "name": ...}.
    """
    mapping = {
        "deputy": ("Deputy", "camara_id"),
        "beneficiary": ("Beneficiary", "cnpj_cpf"),
        "party": ("Party", "acronym"),
        "state": ("State", "uf"),
    }
    prefix, _, key = entity_id.partition("_")
    if not key:
        raise HTTPException(status_code=400, detail=f"Invalid entity_id format: {entity_id}")

    # Municipality uses a composite key: municipality_{uf}_{name}
    if prefix == "municipality":
        parts = key.split("_", 1)
        if len(parts) != 2 or not parts[0] or not parts[1]:
            raise HTTPException(
                status_code=400, detail=f"Invalid municipality entity_id: {entity_id}"
            )
        return "Municipality", None, {"uf": parts[0], "name": parts[1]}

    if prefix not in mapping:
        raise HTTPException(status_code=400, detail=f"Invalid entity_id format: {entity_id}")

    label, prop = mapping[prefix]
    # camara_id is an integer in Neo4j
    value: str | int = int(key) if prefix == "deputy" else key
    return label, prop, value


@router.get("/{entity_id}")
async def subgraph(
    entity_id: str,
    depth: int = Query(default=2, ge=1, le=3),
    max_nodes: int = Query(default=100, ge=1, le=300),
    year: int | None = None,
    neo4j=Depends(get_neo4j),
):
    label, prop, value = _parse_entity_id(entity_id)

    # Build center MATCH clause — municipality uses composite key, others use single prop
    if prop is None:
        center_match = f"MATCH (center:{label} {{uf: $uf, name: $name}})"
        run_params: dict = dict(depth=depth, max_nodes=max_nodes, year=year,
                                uf=value["uf"], name=value["name"])  # type: ignore[index]
    else:
        center_match = f"MATCH (center:{label} {{{prop}: $value}})"
        run_params = dict(value=value, depth=depth, max_nodes=max_nodes, year=year)

    # Collect nodes and relationships up to `depth` hops from center,
    # optionally filtering SENT_AMENDMENT edges to a specific year.
    query = f"""
        {center_match}
        CALL apoc.path.subgraphAll(center, {{
            maxLevel: $depth,
            limit: $max_nodes
        }})
        YIELD nodes, relationships
        WITH nodes,
             CASE WHEN $year IS NOT NULL
                  THEN [r IN relationships WHERE NOT type(r) = 'SENT_AMENDMENT' OR r.year = $year]
                  ELSE relationships END AS relationships
        RETURN nodes, relationships
    """

    try:
        result = await neo4j.run(query, **run_params)
        record = await result.single()

        if record is None:
            raise HTTPException(status_code=404, detail=f"Entity {entity_id} not found")

        raw_nodes = record["nodes"]
        raw_rels = record["relationships"]

        # Build Cytoscape-compatible output
        seen_node_ids = set()
        nodes = []
        for node in raw_nodes:
            if len(nodes) >= max_nodes:
                break
            node_data = _node_to_cytoscape(node)
            if node_data["data"]["id"] not in seen_node_ids:
                seen_node_ids.add(node_data["data"]["id"])
                nodes.append(node_data)

        edges = []
        for rel in raw_rels:
            edge_data = _rel_to_cytoscape(rel, seen_node_ids)
            if edge_data:
                edges.append(edge_data)

        return {"center_id": entity_id, "nodes": nodes, "edges": edges}

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Graph query failed") from exc


def _node_to_cytoscape(node) -> dict:
    labels = list(node.labels)
    node_type = labels[0].lower() if labels else "unknown"
    props = dict(node)

    # Determine id and label based on node type
    if "Deputy" in node.labels:
        nid = f"deputy_{props.get('camara_id', node.element_id)}"
        nlabel = props.get("name", "")
    elif "Beneficiary" in node.labels:
        nid = f"beneficiary_{props.get('cnpj_cpf', node.element_id)}"
        nlabel = props.get("name", "")
    elif "Party" in node.labels:
        nid = f"party_{props.get('acronym', node.element_id)}"
        nlabel = props.get("acronym", "")
    elif "State" in node.labels:
        nid = f"state_{props.get('uf', node.element_id)}"
        nlabel = props.get("uf", "")
    elif "Municipality" in node.labels:
        uf = props.get("uf", "")
        name = props.get("name", node.element_id)
        nid = f"municipality_{uf}_{name}"
        nlabel = name
    else:
        nid = node.element_id
        nlabel = node.element_id

    return {"data": {"id": nid, "label": nlabel, "type": node_type, **props}}


def _rel_to_cytoscape(rel, valid_node_ids: set) -> dict | None:
    start_node = rel.start_node
    end_node = rel.end_node

    source = _node_id(start_node)
    target = _node_id(end_node)

    # Only include edges where both endpoints are in our node set
    if source not in valid_node_ids or target not in valid_node_ids:
        return None

    props = dict(rel)
    return {
        "data": {
            "id": f"{rel.type}_{source}_{target}",
            "source": source,
            "target": target,
            "type": rel.type.lower(),
            **props,
        }
    }


def _node_id(node) -> str:
    props = dict(node)
    if "Deputy" in node.labels:
        return f"deputy_{props.get('camara_id', node.element_id)}"
    if "Beneficiary" in node.labels:
        return f"beneficiary_{props.get('cnpj_cpf', node.element_id)}"
    if "Party" in node.labels:
        return f"party_{props.get('acronym', node.element_id)}"
    if "State" in node.labels:
        return f"state_{props.get('uf', node.element_id)}"
    if "Municipality" in node.labels:
        uf = props.get("uf", "")
        name = props.get("name", node.element_id)
        return f"municipality_{uf}_{name}"
    return node.element_id
