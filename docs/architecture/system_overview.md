---
id: arch-system-overview
title: "System Overview — Cotagraph Architecture"
type: architecture
status: decided
tags: [architecture, overview, components, layers]
related: [architecture/graph_schema, architecture/database_schema, diagrams/all_diagrams]
created: 2026-04-07
updated: 2026-04-07
summary: "Five-layer architecture: browser → CDN → FastAPI → Neo4j/PostgreSQL/Redis → ETL worker pulling from external sources."
---

# System Overview — Cotagraph Architecture

## Five Layers

```
1. Client        — React + Vite + TypeScript + Cytoscape.js (browser)
2. Edge          — Vercel CDN (static assets, HTTPS termination)
3. API           — FastAPI on Google Cloud Run + Redis cache
4. Data          — Neo4j (graph) + PostgreSQL (source of truth) + Elasticsearch (Phase 2)
5. Ingestion     — Python ETL worker triggered by GitHub Actions cron
```

External sources feed Layer 5 only. The browser never talks to a database directly.

## Layer Responsibilities

### Layer 1 — Client (Browser)

- **React + Vite + TypeScript:** component framework and build tooling
- **Cytoscape.js:** graph rendering with `cose-bilkent` layout algorithm
- **Zustand:** graph UI state (selected node, filters, expanded nodes)
- **TanStack Query:** data fetching with stale-while-revalidate browser cache
- **react-router-dom:** client-side routing (`/`, `/graph`, `/deputy/:id`, `/beneficiary/:cnpj`)

### Layer 2 — Edge (Vercel)

- Serves the compiled React static bundle
- CDN caches static assets globally
- Proxies `/api/*` requests to Cloud Run backend
- Automatic HTTPS and custom domain

### Layer 3 — API (FastAPI on Cloud Run)

- REST endpoints under `/api/v1/`
- WebSocket at `/ws/graph-updates` (Phase 2)
- Redis (Upstash) caches expensive graph query responses with 5-minute TTL
- Scales to zero when idle (Cloud Run free tier)
- Serves OpenAPI docs at `/docs`

### Layer 4 — Data

| Store | Role | Why |
| --- | --- | --- |
| Neo4j AuraDB | Graph traversal and path queries | Native graph model; Cypher is cleaner than recursive SQL CTEs |
| PostgreSQL (Supabase) | Source of truth, ETL audit log | ACID guarantees, FK constraints, Alembic migrations, rebuildable |
| Elasticsearch (Bonsai) | Full-text search for deputies/beneficiaries | Phase 2 only |

### Layer 5 — Ingestion (ETL Worker)

- Separate Docker container (`ingestion/`) with its own heavy dependencies (pandas, numpy)
- Triggered by GitHub Actions cron (weekly in MVP, Celery in Phase 3)
- Pulls from: Câmara API, CGU Portal, IBGE API, local CSV files
- Writes to PostgreSQL first (UPSERT), then syncs to Neo4j (UNWIND MERGE)
- Records every run in `sync_logs` table

## Cross-Cutting Concerns

- **Caching:** Two layers — TanStack Query (browser, stale-while-revalidate) + Redis (server, TTL=5min)
- **Error handling:** ETL failures logged to `sync_logs`; API errors return RFC 7807 Problem JSON
- **Security:** No secrets in code; env vars injected at runtime; no direct DB access from browser
- **Idempotency:** All ETL operations use UPSERT/MERGE — safe to re-run without duplicates

## Full Diagram

See `diagrams/all_diagrams.md` — Diagram 1 (Logical Architecture).
