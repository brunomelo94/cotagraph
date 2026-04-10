---
id: ctx-roadmap
title: "Roadmap — Cotagraph"
type: context
status: current
tags: [roadmap, phases, milestones, scope]
created: 2026-04-07
updated: 2026-04-07
summary: "Four-phase roadmap with milestones and scope boundaries. Phase 1 is MVP; later phases add intelligence and scale."
---

# Roadmap — Cotagraph

## Phase 1 — MVP Foundation (Weeks 1–6)

**Goal:** A working graph visualization running locally with real amendments data.

**Milestone:** `localhost:3000` shows a search bar. Searching a deputy name renders their graph. Nodes are clickable. Data is real (from 2024 amendments CSV).

**Scope:**

- Docker Compose stack: FastAPI + Neo4j + PostgreSQL + Redis + React
- ETL: load `emendas_por_favorecido_partidos.csv` into Neo4j (no API calls yet)
- API: `/stats/summary`, `/deputies`, `/graph/{entity_id}`, `/graph/top-spenders`
- Frontend: search-first UX, graph canvas, sidebar with deputy card
- No auth, no Elasticsearch, no mobile, no cloud deployment

**Build order (critical path):**

1. `infra/docker-compose.yml` — stack starts
2. `ingestion/pipelines/amendments_loader.py` — real data in Neo4j
3. `backend/app/services/graph_service.py` — Cypher queries work
4. `backend/app/api/graph.py` — API serves Cytoscape JSON
5. `frontend/src/components/Graph/GraphCanvas.tsx` — graph renders
6. `frontend/src/pages/GraphPage.tsx` — search bar + top spenders list

---

## Phase 2 — Graph Features (Weeks 6–12)

**Goal:** Richer graph analysis and data completeness.

**Milestone:** Users can find shortest paths between deputies, search by name, and see CEAP expenses alongside amendments.

**Scope:**

- Elasticsearch full-text search for deputies and beneficiaries
- WebSocket `/ws/graph-updates` for live data push
- Neo4j shortest-path queries between two deputies
- CEAP expense ingestion from Câmara API annual ZIP files
- JWT auth for admin panel (manual data refresh trigger)
- Cypher Graph Data Science: PageRank on beneficiaries

---

## Phase 3 — Intelligence (Weeks 12–20)

**Goal:** Automated freshness, anomaly detection, AI summaries.

**Milestone:** App auto-refreshes weekly. Anomalous spending patterns flagged. Claude API generates plain-language summaries of deputy spending profiles.

**Scope:**

- Celery + Redis broker for scheduled ETL (replaces GitHub Actions cron)
- Anomaly detection: deputies concentrating amendments to single beneficiary
- Claude API integration: generate deputy spending summary in plain Portuguese
- GitHub Actions CI/CD → Google Cloud Run + Vercel (cloud deployment)
- `process/localization.md` i18n implementation with react-i18next

---

## Phase 4 — Scale & Polish (Week 20+)

**Goal:** Public-facing, production-grade, shareable.

**Milestone:** App is live at a public URL. API is documented and open. Data quality pipeline runs continuously.

**Scope:**

- Public cloud deployment (Cloud Run + Vercel)
- Public API documentation (FastAPI `/docs` exposed)
- Data quality pipeline: deduplication, missing-CNPJ handling
- Mobile-responsive UI
- TCU data source integration (federal audit data)
- Performance: Neo4j query optimization, Redis cache tuning

---

## Out of Scope (for all phases)

- User accounts / saved graph views (may add in Phase 4 if needed)
- Real-time WebSocket streaming of live government API (government APIs don't push events)
- Scraped data (only official open data sources)
- State-level deputies (deputados estaduais) — federal only
- Historical data before 2019 (pre-Constitutional Amendment 105)
