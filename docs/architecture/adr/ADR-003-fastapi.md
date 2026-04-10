---
id: adr-003-fastapi
title: "ADR-003: FastAPI for Backend API"
type: adr
status: decided
tags: [fastapi, python, backend, api, async]
related: [architecture/api_contracts, architecture/system_overview]
created: 2026-04-07
updated: 2026-04-07
summary: "FastAPI chosen for its async-native design, auto OpenAPI docs, Pydantic v2 performance, and Python familiarity."
---

# ADR-003: FastAPI for Backend API

## Status

Decided — 2026-04-07

## Context

We need a backend API framework. The owner knows Python well (from the MBA thesis data pipeline). The API must handle concurrent Neo4j and Redis calls efficiently.

## Decision

Use FastAPI with `uvicorn` (ASGI server) and Pydantic v2 for request/response validation.

## Rationale

- **Async-native:** `async/await` throughout means Neo4j query + Redis cache check can run concurrently without blocking the event loop. Critical for graph endpoints that chain multiple queries.
- **Auto OpenAPI docs:** `/docs` is generated automatically — useful when the API is later made public.
- **Pydantic v2:** Fast serialization of complex nested graph response shapes. Type safety reduces bugs at the API boundary.
- **Python familiarity:** Bruno already writes Python daily for the thesis pipeline. No new language to learn for the backend — learning is in the architecture patterns, not the syntax.
- **Lifespan events:** Clean startup/shutdown hooks for Neo4j driver initialization and Redis connection pool.

## Alternatives Considered

| Option | Rejected because |
| --- | --- |
| Django + DRF | Synchronous by default; heavier ORM overhead; more boilerplate for an API-only service |
| Flask | No async support; no auto-docs; more manual wiring |
| Node.js (Express/Fastify) | Adds a second language; no Python data science ecosystem |
| Go | Excellent performance but steep learning curve; not justified for MVP throughput needs |

## Consequences

- Python is the backend language — future contributors must know Python
- Must use async drivers: `neo4j` async API, `asyncpg` for PostgreSQL, `redis.asyncio`
- `pyproject.toml` + `uv` (or `poetry`) for dependency management
