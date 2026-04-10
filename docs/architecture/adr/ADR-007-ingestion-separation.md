---
id: adr-007-ingestion-separation
title: "ADR-007: ETL as a Separate Docker Container"
type: adr
status: decided
tags: [etl, docker, ingestion, architecture, phase1]
related: [adr-008-free-tier-cloud, data/etl_pipeline]
created: 2026-04-07
updated: 2026-04-07
summary: "ETL pipeline runs as a separate Docker container with its own pyproject.toml. Triggered on-demand locally and via GitHub Actions cron in production."
---

# ADR-007: ETL as a Separate Docker Container

## Status

Decided — 2026-04-07

## Context

The data ingestion pipeline needs heavy Python libraries (pandas, numpy) for CSV parsing and normalization. These should not be part of the API container.

## Decision

Create a separate `ingestion/` directory with its own `Dockerfile` and `pyproject.toml`. In Docker Compose, it runs as a separate service with `profiles: ["ingestion"]` — it only starts when explicitly needed.

In production, ingestion runs as a **GitHub Actions workflow** (cron-triggered), not as an always-on container. The GitHub Actions runner installs the ingestion dependencies and runs the pipeline scripts directly against the production databases.

## Rationale

- **Image size:** pandas + numpy + scikit-learn add ~300MB to a Docker image. The FastAPI backend image should be lean (~150MB). Separation keeps the API fast to pull and deploy.
- **Dependency isolation:** The ingestion pipeline can use different library versions than the API without conflict. `pyproject.toml` per service enforces this.
- **No always-on cost:** An always-on Celery worker costs money or uses free-tier quota. A weekly GitHub Actions cron uses ~5 minutes of the free 2000 min/month — negligible.
- **On-demand locally:** `docker compose --profile ingestion run ingestion python pipelines/amendments_loader.py` — runs and exits, doesn't stay alive.

## Alternatives Considered

| Option | Rejected because |
| --- | --- |
| Ingestion code inside the FastAPI container | Bloats API image; dependency conflicts; ingestion should not be a running service |
| Always-on Celery worker | Costs free-tier quota; adds Redis queue infrastructure complexity not needed until Phase 3 |
| Serverless function (Lambda/Cloud Run Job) | Good option for Phase 3; adds deployment complexity not justified in Phase 1 |

## Consequences

- Two Python projects to maintain (`backend/` and `ingestion/`) with separate deps
- GitHub Actions workflow file must install ingestion deps and set DB connection env vars
- Phase 3 upgrade path: replace GitHub Actions cron with Celery Beat + Redis broker
