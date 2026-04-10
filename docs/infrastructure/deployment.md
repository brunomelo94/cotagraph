---
id: infra-deployment
title: "Cloud Deployment — Cloud Run + Vercel"
type: infrastructure
status: planned
tags: [deployment, cloud-run, vercel, gcp, github-actions, phase3]
related: [infrastructure/free_tier_stack, process/cicd_pipeline, architecture/adr/ADR-008-free-tier-cloud]
created: 2026-04-07
updated: 2026-04-07
summary: "Production deployment: FastAPI on Google Cloud Run, React on Vercel, PostgreSQL on Supabase, Neo4j on AuraDB. Triggered by GitHub Actions on merge to main. Target: Phase 3."
---

# Cloud Deployment

> **Note:** Cloud deployment is Phase 3. This document describes the planned approach.

## Architecture

```
GitHub (source) → GitHub Actions CI/CD
  ├── Backend: docker build → push GHCR → gcloud run deploy → Cloud Run
  └── Frontend: Vercel auto-deploys from GitHub (no CI step needed)

Databases: managed services, no deployment needed
  ├── PostgreSQL → Supabase (always running)
  ├── Neo4j → AuraDB Free (always running)
  └── Redis → Upstash (serverless, no deploy)
```

---

## Backend: Google Cloud Run

**Trigger:** GitHub Actions CD workflow on merge to `main`

```yaml
# .github/workflows/deploy.yml (planned)
- name: Deploy to Cloud Run
  run: |
    docker build -t ghcr.io/brunomelo94/cotagraph-backend:$GITHUB_SHA ./backend
    docker push ghcr.io/brunomelo94/cotagraph-backend:$GITHUB_SHA
    gcloud run deploy cotagraph-backend \
      --image ghcr.io/brunomelo94/cotagraph-backend:$GITHUB_SHA \
      --region us-east1 \
      --platform managed \
      --allow-unauthenticated \
      --memory 512Mi \
      --cpu 1 \
      --min-instances 0 \
      --max-instances 3 \
      --set-env-vars NEO4J_URI=${{ secrets.NEO4J_URI }},DATABASE_URL=${{ secrets.DATABASE_URL }}
```

**Cold start time:** ~3–5 seconds (Cloud Run scales to zero). Acceptable for low-traffic MVP.  
**To eliminate cold starts:** Set `--min-instances 1` (~$5/month — deferred to Phase 4).

---

## Frontend: Vercel

**Trigger:** Automatic — Vercel GitHub integration watches `main` branch.

No CI step needed. Push to `main` → Vercel builds and deploys in ~60 seconds.

**Environment variables set in Vercel dashboard:**
- `VITE_API_URL` = Cloud Run service URL (e.g. `https://cotagraph-backend-xxx-ue.a.run.app`)

---

## Production Environment Variables (GitHub Secrets)

All secrets stored in GitHub → Settings → Secrets and Variables → Actions:

| Secret | Value |
| --- | --- |
| `NEO4J_URI` | AuraDB connection URI |
| `NEO4J_PASSWORD` | AuraDB password |
| `DATABASE_URL` | Supabase connection string |
| `REDIS_URL` | Upstash Redis URL |
| `GCP_SA_KEY` | Google Cloud service account JSON (for `gcloud` CLI) |
| `GCP_PROJECT_ID` | Google Cloud project ID |

---

## ETL in Production

The ingestion pipeline runs as a GitHub Actions scheduled workflow:

```yaml
# .github/workflows/etl.yml (planned)
on:
  schedule:
    - cron: '0 3 * * 1'   # Monday 03:00 UTC
  workflow_dispatch:        # Allow manual trigger

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

## Environments

| Environment | Branch | Backend | Frontend | Database |
| --- | --- | --- | --- | --- |
| Local dev | any | localhost:8000 | localhost:3000 | Docker Compose |
| Production | main | Cloud Run | Vercel | Supabase + AuraDB |

No staging environment in Phase 1–2. Add staging in Phase 3 when Playwright E2E tests run against it.
