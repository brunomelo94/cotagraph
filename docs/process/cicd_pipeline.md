---
id: process-cicd-pipeline
title: "CI/CD Pipeline — GitHub Actions"
type: process
status: decided
tags: [cicd, github-actions, deployment, testing, branch-strategy, phase1]
related: [architecture/adr/ADR-008-free-tier-cloud, infrastructure/deployment, process/testing_strategy]
created: 2026-04-07
updated: 2026-04-07
summary: "GitHub Actions CI on every PR (lint + test + build). CD on merge to main (Cloud Run + Vercel). ETL cron weekly. Path filters prevent unnecessary runs."
---

# CI/CD Pipeline — GitHub Actions

## Branch Strategy

| Branch | Purpose | Protection |
| --- | --- | --- |
| `main` | Production. Auto-deploys on push. | Branch protection: all CI checks must pass, no direct push |
| `feat/*` | Feature branches. PRs open against `main`. | None |
| `fix/*` | Bug fixes. PRs open against `main`. | None |
| `chore/*` | Maintenance (deps, docs, infra). | None |

No `develop` branch in Phase 1. Staging environment added in Phase 3.

---

## Workflow Files (planned)

### `.github/workflows/ci.yml` — Runs on every PR

```yaml
name: CI
on:
  pull_request:
    branches: [main]

jobs:
  backend:
    if: contains(github.event.pull_request.changed_files, 'backend/')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install -e "backend/[dev]"
      - run: ruff check backend/
      - run: mypy backend/app/
      - run: pytest backend/tests/ -v --timeout=120

  frontend:
    if: contains(github.event.pull_request.changed_files, 'frontend/')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd frontend && npm ci
      - run: cd frontend && npm run type-check
      - run: cd frontend && npm run test

  docker-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t cotagraph-backend:test ./backend
      - run: docker build -t cotagraph-frontend:test ./frontend
```

### `.github/workflows/deploy.yml` — Runs on merge to main

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: google-github-actions/auth@v2
        with: { credentials_json: '${{ secrets.GCP_SA_KEY }}' }
      - run: |
          docker build -t ghcr.io/brunomelo94/cotagraph-backend:$GITHUB_SHA ./backend
          docker push ghcr.io/brunomelo94/cotagraph-backend:$GITHUB_SHA
          gcloud run deploy cotagraph-backend \
            --image ghcr.io/brunomelo94/cotagraph-backend:$GITHUB_SHA \
            --region us-east1 --platform managed --allow-unauthenticated
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  # Frontend: Vercel auto-deploys via GitHub integration — no job needed
```

### `.github/workflows/etl.yml` — Scheduled ETL

```yaml
name: ETL Sync
on:
  schedule:
    - cron: '0 3 * * 1'    # Monday 03:00 UTC
  workflow_dispatch:          # manual trigger from GitHub UI

jobs:
  ingest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install -e ingestion/
      - run: python ingestion/pipelines/amendments_loader.py
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          NEO4J_URI: ${{ secrets.NEO4J_URI }}
          NEO4J_PASSWORD: ${{ secrets.NEO4J_PASSWORD }}
```

---

## Path Filters — Saving CI Minutes

Path filters ensure backend changes don't trigger frontend tests and vice versa. This prevents wasting the 2,000 min/month free tier on unnecessary runs.

| Changed path | Jobs that run |
| --- | --- |
| `backend/**` | backend CI job + docker-build |
| `frontend/**` | frontend CI job + docker-build |
| `ingestion/**` | No CI (ETL tested separately) |
| `docs/**` | Nothing (docs don't need CI) |
| Any + `main` | Full deploy workflow |

---

## Secrets Required

Set in GitHub → Settings → Secrets → Actions:

| Secret | Used in |
| --- | --- |
| `GCP_SA_KEY` | deploy.yml — gcloud auth |
| `GCP_PROJECT_ID` | deploy.yml |
| `DATABASE_URL` | etl.yml, deploy.yml (injected to Cloud Run) |
| `NEO4J_URI` | etl.yml, deploy.yml |
| `NEO4J_PASSWORD` | etl.yml, deploy.yml |
| `REDIS_URL` | deploy.yml |

Never put secrets in code or `.env` files committed to git.
