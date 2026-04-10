---
id: arch-graph-schema
title: "Graph Schema — Neo4j Nodes and Edges"
type: architecture
status: decided
tags: [neo4j, graph, schema, cypher, nodes, edges, phase1]
related: [architecture/adr/ADR-001-neo4j, architecture/database_schema, diagrams/all_diagrams]
created: 2026-04-07
updated: 2026-04-07
summary: "Neo4j graph model: 5 node types (Deputy, Beneficiary, Municipality, Party, State) and 6 edge types. Natural keys and key Cypher patterns included."
---

# Graph Schema — Neo4j

## Node Types

### `:Deputy`

Represents a Brazilian federal deputy (member of the Chamber of Deputies).

| Property | Type | Source | Notes |
| --- | --- | --- | --- |
| `camara_id` | integer | Câmara API `id` / CEAP `idecadastro` | **Natural key** — unique, stable |
| `name` | string | Câmara API `nome` | Uppercase, unaccented |
| `party` | string | Câmara API `siglaPartido` | e.g. `"PL"`, `"PT"` |
| `state` | string | Câmara API `siglaUf` | 2-letter UF code |
| `photo_url` | string | Câmara API `urlFoto` | May be null |

### `:Beneficiary`

Any entity that receives money from a deputy (municipality government, private company, individual, state government).

| Property | Type | Source | Notes |
| --- | --- | --- | --- |
| `cnpj_cpf` | string | CGU `CNPJ / CPF do Favorecido` | **Natural key** — stripped of formatting |
| `name` | string | CGU `Favorecido` | Cleaned, uppercase |
| `legal_nature` | string | Derived | `"PJ"`, `"PF"`, `"Ente Público Municipal"`, `"Ente Público Estadual"`, `"Ente Público Federal"` |
| `uf` | string | CGU `Localidade do Gasto` | 2-letter code |
| `municipality` | string | CGU `Localidade do Gasto` | Municipality name when available |

### `:Municipality`

Brazilian municipality from IBGE master list.

| Property | Type | Source | Notes |
| --- | --- | --- | --- |
| `ibge_code` | string | IBGE API | **Natural key** — 7-digit code |
| `name` | string | IBGE API | Official IBGE name |
| `uf` | string | IBGE API | 2-letter state code |

### `:Party`

Political party.

| Property | Type | Notes |
| --- | --- | --- |
| `acronym` | string | **Natural key** — e.g. `"PL"`, `"PT"`, `"MDB"` |
| `full_name` | string | e.g. `"Partido Liberal"` |

### `:State`

Brazilian state (UF).

| Property | Type | Notes |
| --- | --- | --- |
| `uf` | string | **Natural key** — 2-letter code |
| `name` | string | e.g. `"São Paulo"` |

---

## Edge Types

### `[:SENT_AMENDMENT]`

A deputy sent a budget amendment to a beneficiary.

`(:Deputy)-[:SENT_AMENDMENT]->(:Beneficiary)`

| Property | Type | Notes |
| --- | --- | --- |
| `amendment_code` | string | Unique per amendment |
| `amount_brl` | float | `Valor Pago` — canonical paid amount |
| `amount_committed_brl` | float | `Valor Empenhado` |
| `year` | integer | Fiscal year |
| `amendment_type` | string | e.g. `"Emenda Individual - Transferências Especiais"` |
| `policy_area` | string | e.g. `"Saúde"`, `"Educação"` |

### `[:SPENT_ON]`

A deputy spent CEAP allowance at a supplier.

`(:Deputy)-[:SPENT_ON]->(:Beneficiary)`

| Property | Type | Notes |
| --- | --- | --- |
| `expense_category` | string | e.g. `"ALIMENTAÇÃO"`, `"PASSAGEM AÉREA"` |
| `amount_brl` | float | `vlrLiquido` — net reimbursed amount |
| `year` | integer | |
| `month` | integer | |
| `document_number` | string | NF or receipt number |

### `[:MEMBER_OF]`

Deputy belongs to a party.

`(:Deputy)-[:MEMBER_OF]->(:Party)`  
No properties. Reflects current affiliation at ingestion time.

### `[:REPRESENTS]`

Deputy represents a state.

`(:Deputy)-[:REPRESENTS]->(:State)`  
No properties.

### `[:LOCATED_IN]`

Beneficiary is located in a municipality.

`(:Beneficiary)-[:LOCATED_IN]->(:Municipality)`  
No properties. Only for beneficiaries where municipality is known.

### `[:PART_OF]`

Municipality belongs to a state.

`(:Municipality)-[:PART_OF]->(:State)`  
No properties.

---

## Key Cypher Query Patterns

```cypher
-- Top amendment recipients for a specific deputy
MATCH (d:Deputy {camara_id: $id})-[r:SENT_AMENDMENT]->(b:Beneficiary)
RETURN b.name, b.cnpj_cpf, sum(r.amount_brl) AS total
ORDER BY total DESC LIMIT 20

-- Deputies who share the same beneficiary (network proximity)
MATCH (d:Deputy {camara_id: $id})-[:SENT_AMENDMENT]->(b:Beneficiary)
      <-[:SENT_AMENDMENT]-(other:Deputy)
WHERE other <> d
RETURN other.name, other.party, count(b) AS shared_beneficiaries
ORDER BY shared_beneficiaries DESC LIMIT 20

-- 2-hop subgraph centered on a deputy (for graph canvas)
MATCH (d:Deputy {camara_id: $id})-[r*..2]-(n)
RETURN d, r, n LIMIT 100

-- Shortest path between two deputies via shared beneficiaries
MATCH path = shortestPath(
  (d1:Deputy {camara_id: $id1})-[*..6]-(d2:Deputy {camara_id: $id2})
)
RETURN path

-- Top spenders by total amendment amount in a year
MATCH (d:Deputy)-[r:SENT_AMENDMENT {year: $year}]->(b:Beneficiary)
RETURN d.name, d.party, d.state, sum(r.amount_brl) AS total
ORDER BY total DESC LIMIT 20

-- Total flow by state (where does money go geographically)
MATCH (d:Deputy)-[r:SENT_AMENDMENT]->(b:Beneficiary)
      -[:LOCATED_IN]->(:Municipality)-[:PART_OF]->(s:State)
RETURN s.uf, sum(r.amount_brl) AS total
ORDER BY total DESC
```

---

## Neo4j Constraints (to create on first run)

```cypher
CREATE CONSTRAINT deputy_camara_id IF NOT EXISTS
  FOR (d:Deputy) REQUIRE d.camara_id IS UNIQUE;

CREATE CONSTRAINT beneficiary_cnpj_cpf IF NOT EXISTS
  FOR (b:Beneficiary) REQUIRE b.cnpj_cpf IS UNIQUE;

CREATE CONSTRAINT municipality_ibge_code IF NOT EXISTS
  FOR (m:Municipality) REQUIRE m.ibge_code IS UNIQUE;

CREATE CONSTRAINT party_acronym IF NOT EXISTS
  FOR (p:Party) REQUIRE p.acronym IS UNIQUE;

CREATE CONSTRAINT state_uf IF NOT EXISTS
  FOR (s:State) REQUIRE s.uf IS UNIQUE;
```
