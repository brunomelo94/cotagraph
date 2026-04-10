---
id: infra-local-dev
title: "Local Development Setup"
type: infrastructure
status: planned
tags: [local-dev, docker, docker-compose, setup, phase1]
related: [infrastructure/free_tier_stack, context/roadmap]
created: 2026-04-07
updated: 2026-04-07
summary: "How to run the full Cotagraph stack locally with Docker Compose. Prerequisites, service ports, and Makefile targets. Note: no code built yet — this is the planned setup."
---

# Local Development Setup

> **Note:** Application code has not been written yet. This document describes the planned local dev setup for Phase 1.

## Prerequisites

- Docker Desktop (Windows: WSL2 backend recommended)
- Git
- Python 3.12+ (for running ingestion scripts outside Docker)
- Node.js 20+ (for frontend development outside Docker)

---

## Services and Ports

| Service | Port | URL | Notes |
| --- | --- | --- | --- |
| React frontend | 3000 | http://localhost:3000 | Vite dev server with HMR |
| FastAPI backend | 8000 | http://localhost:8000 | Auto-reload on code change |
| FastAPI docs | 8000 | http://localhost:8000/docs | OpenAPI UI |
| PostgreSQL | 5432 | — | Connect via `postgresql://cotagraph:cotagraph@localhost:5432/cotagraph` |
| Neo4j Browser | 7474 | http://localhost:7474 | Web UI for Cypher queries |
| Neo4j Bolt | 7687 | — | Driver connection |
| Redis | 6379 | — | `redis://localhost:6379/0` |
| Elasticsearch | 9200 | http://localhost:9200 | Phase 2, `--profile phase2` only |

---

## Makefile Targets (planned)

```bash
make up          # Start all core services (backend, frontend, postgres, neo4j, redis)
make down        # Stop and remove containers
make logs        # Tail logs from all services
make ingest      # Run amendments_loader.py (loads seed CSV into PG + Neo4j)
make test        # Run backend (pytest) + frontend (vitest) tests
make migrate     # Run Alembic migrations
make neo4j-shell # Open Cypher shell inside Neo4j container
make psql        # Open psql shell inside PostgreSQL container
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in values:

```bash
# PostgreSQL
POSTGRES_DB=cotagraph
POSTGRES_USER=cotagraph
POSTGRES_PASSWORD=localdev_only

# Neo4j
NEO4J_AUTH=neo4j/localdev_only
NEO4J_URI=bolt://neo4j:7687

# Redis
REDIS_URL=redis://redis:6379/0

# Backend
DATABASE_URL=postgresql+asyncpg://cotagraph:localdev_only@postgres:5432/cotagraph
SECRET_KEY=dev_secret_key_change_in_production

# Frontend
VITE_API_URL=http://localhost:8000
```

**Never commit `.env`** — it is in `.gitignore`. Use `.env.example` for the template.

---

## Docker Compose Profiles

```bash
# Core services only (default)
docker compose up

# Add Elasticsearch (Phase 2)
docker compose --profile phase2 up

# Run ingestion pipeline (on demand, exits after completion)
docker compose --profile ingestion run ingestion python pipelines/amendments_loader.py
```

---

## First Run Sequence

```bash
git clone https://github.com/brunomelo94/cotagraph
cd cotagraph
cp .env.example .env           # fill in passwords
make up                        # start services (~30 seconds first time)
make migrate                   # create PostgreSQL tables
make ingest                    # load seed amendments CSV (~2-5 minutes)
# open http://localhost:3000   # app should show top spenders
# open http://localhost:7474   # Neo4j browser to verify graph loaded
```
