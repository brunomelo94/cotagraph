---
id: adr-008-free-tier-cloud
title: "ADR-008: Free-Tier Cloud Stack"
type: adr
status: decided
tags: [infrastructure, cloud, free-tier, vercel, cloud-run, supabase, upstash, auradb]
related: [infrastructure/free_tier_stack, infrastructure/deployment]
created: 2026-04-07
updated: 2026-04-07
summary: "Chosen free-tier stack: Vercel (frontend), Google Cloud Run (backend), Supabase (PostgreSQL), Neo4j AuraDB Free (graph), Upstash (Redis). Hard cost constraint: near zero."
---

# ADR-008: Free-Tier Cloud Stack

## Status

Decided — 2026-04-07

## Context

This is a personal/portfolio project. Infrastructure cost must be near zero. The stack must support Docker containers, managed databases, and automatic deployment from GitHub.

## Decision

| Component | Service | Free Limit |
| --- | --- | --- |
| Frontend hosting | Vercel Hobby | 100GB bandwidth/mo, **non-commercial use only** |
| Backend API | Google Cloud Run | 2M requests/mo, 360K GB-seconds compute |
| PostgreSQL | Supabase | 500MB storage, **pauses after 7 days inactivity** (keepalive cron mitigates) |
| Neo4j (graph) | Neo4j AuraDB Free | **200K nodes+relationships combined** |
| Redis (cache) | Upstash | **500K commands/month**, 256MB data |
| Elasticsearch | Bonsai.io | 125MB, 10K docs (Phase 2) |
| CI/CD | GitHub Actions | 2,000 min/month for private repos |
| Container registry | GHCR (GitHub) | Free for public repos |

## Rationale

- **Vercel:** Best free tier for React/Vite. Automatic deploys on push to main. Global CDN. Custom domain. No config needed — GitHub integration handles everything.
- **Google Cloud Run:** Scales to zero (no idle cost). 2M requests/month is far more than a new app needs. FastAPI containers deploy cleanly. Better fit than Lambda (which is stateless and poor for connection pooling).
- **Supabase:** PostgreSQL that never sleeps on free tier (unlike Render, which sleeps after 15 min). 500MB is enough for 2-3 years of amendment data. Region sa-east-1 is closest to Brazil.
- **Neo4j AuraDB Free:** Only managed Neo4j option with a permanent free tier. 50K nodes should fit 1-2 years of data.
- **Upstash:** Serverless Redis — no idle cost. 10K req/day is sufficient for API caching in early traffic.

## Alternatives Rejected

| Option | Rejected because |
| --- | --- |
| Heroku | No free tier since 2022 |
| Render (backend) | Free tier sleeps after 15 min — bad for an API |
| Railway | $5/month credit — good alternative if Cloud Run setup is complex |
| AWS Lambda | Poor fit for stateful FastAPI with connection pools |
| Fly.io (Neo4j) | Free VMs: 256MB RAM — Neo4j needs 512MB minimum |

## Consequences

- Hard cost ceiling: $0/month in Phase 1-2
- If any free tier limit is hit, the upgrade path is defined in `infrastructure/free_tier_stack.md`
- All secrets managed via GitHub Secrets → injected as env vars at deploy time
