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
                   d.state AS state, sum(r.amount_brl) AS total_brl
            ORDER BY total_brl DESC LIMIT $limit
        """
        result = await neo4j.run(query, year=year, limit=limit)
    else:
        query = """
            MATCH (d:Deputy)-[r:SENT_AMENDMENT]->(b:Beneficiary)
            RETURN d.camara_id AS camara_id, d.name AS name, d.party AS party,
                   d.state AS state, sum(r.amount_brl) AS total_brl
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


def _parse_entity_id(entity_id: str) -> tuple[str, str, str]:
    """Return (label, key_prop, key_value) from an entity_id like deputy_4497."""
    mapping = {
        "deputy": ("Deputy", "camara_id"),
        "beneficiary": ("Beneficiary", "cnpj_cpf"),
        "party": ("Party", "acronym"),
    }
    prefix, _, key = entity_id.partition("_")
    if prefix not in mapping or not key:
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

    # Collect nodes and relationships up to `depth` hops from center,
    # optionally filtering SENT_AMENDMENT edges to a specific year.
    query = f"""
        MATCH (center:{label} {{{prop}: $value}})
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
    result = await neo4j.run(query, value=value, depth=depth, max_nodes=max_nodes, year=year)
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
        nid = f"municipality_{props.get('ibge_code', node.element_id)}"
        nlabel = props.get("name", "")
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
        return f"municipality_{props.get('ibge_code', node.element_id)}"
    return node.element_id
