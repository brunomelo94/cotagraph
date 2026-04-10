---
id: adr-001-neo4j
title: "ADR-001: Neo4j for Graph Storage"
type: adr
status: decided
tags: [neo4j, graph-db, database, phase1]
related: [adr-002-postgresql, architecture/graph_schema]
created: 2026-04-07
updated: 2026-04-07
summary: "Neo4j chosen over PostgreSQL recursive CTEs for graph traversal. AuraDB Free tier: 50K nodes / 175K rels. GDS plugin included."
---

# ADR-001: Neo4j for Graph Storage

## Status

Decided — 2026-04-07

## Context

The core product question — "who sends money to whom, are these entities connected, what is the path between two deputies?" — requires multi-hop graph traversal. We need a query engine that can answer these in milliseconds at interactive speeds.

## Decision

Use Neo4j as the graph query engine. Development uses Neo4j Community Edition via Docker. Production uses Neo4j AuraDB Free (managed, no infra to maintain).

## Rationale

- **Cypher is cleaner than recursive SQL CTEs** for 2+ hop traversals. The difference in readability and performance compounds with depth.
- **Graph Data Science (GDS) plugin** is included in AuraDB — gives PageRank, community detection, and shortest-path algorithms for Phase 2 intelligence features.
- **MERGE + UNWIND pattern** enables idempotent bulk loads from PostgreSQL without duplicating nodes.
- **AuraDB Free** has no infrastructure to maintain — managed backups, TLS, monitoring included.

## Alternatives Considered

| Option | Rejected because |
| --- | --- |
| PostgreSQL recursive CTEs | Expensive and verbose beyond 2 hops; no graph-native algorithms |
| Amazon Neptune | Costs money the moment it starts; no free tier |
| ArangoDB | Smaller ecosystem; multi-model adds complexity we don't need |
| Fly.io self-hosted Neo4j | Free VMs have 256MB RAM; Neo4j needs ~512MB minimum — unreliable |

## Consequences

- Two databases to maintain (Neo4j + PostgreSQL) — accepted complexity
- AuraDB Free limit: 50K nodes / 175K relationships — must verify CSV data fits before launch
- If free tier is exceeded: upgrade to AuraDB Professional (~$65/month) or switch hosting
