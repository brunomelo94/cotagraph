---
id: infra-free-tier-stack
title: "Free-Tier Cloud Stack — Services, Limits, Upgrade Paths"
type: infrastructure
status: decided
tags: [infrastructure, free-tier, cloud, vercel, cloud-run, supabase, neo4j, upstash, redis]
related: [architecture/adr/ADR-008-free-tier-cloud, infrastructure/deployment]
created: 2026-04-07
updated: 2026-04-07
summary: "Full production stack on free tiers: Vercel + Cloud Run + Supabase + AuraDB Free + Upstash. Hard constraint: $0/month. Includes limits and upgrade paths."
---

# Free-Tier Cloud Stack

**Hard constraint:** $0/month in Phase 1–2.

## Services

| Component | Service | Free Limit | Region |
| --- | --- | --- | --- |
| Frontend hosting | Vercel Hobby | 100GB bandwidth/mo, **non-commercial use only** | Global CDN |
| Backend API | Google Cloud Run | 2M req/mo, 360K GB-seconds | us-east1 |
| PostgreSQL | Supabase | 500MB, **pauses after 7 days inactivity** | sa-east-1 (São Paulo) |
| Neo4j (graph) | Neo4j AuraDB Free | **200K nodes+relationships combined** | us-east-1 |
| Redis (cache) | Upstash | **500K commands/month**, 256MB data | Global edge |
| Elasticsearch | Bonsai.io | 125MB, 10K docs | us-east-1 (Phase 2) |
| CI/CD | GitHub Actions | 2,000 min/month (private repo) | — |
| Container registry | GHCR | Free for public repos | — |

---

## Critical Limits to Monitor

### Neo4j AuraDB Free — 200K combined nodes+relationships

**Estimated usage (2024 amendments only):**

- Deputies: ~513 nodes
- Parties: ~30 nodes
- States: 27 nodes
- Municipalities: ~5,570 nodes (if all loaded from IBGE)
- Beneficiaries: **unknown** — must count unique CNPJs in seed CSV before launch
- Relationships: depends on beneficiary count

**Risk:** Much lower than initially feared. 200K combined is generous for MVP. Still need to count the CSV before committing.

### Supabase — 500MB PostgreSQL (pauses after 7 days inactivity)

**Estimated usage:** ~50–100MB for 2024 amendments + deputies + beneficiaries.  
**Risk:** The pause-after-inactivity policy means the API goes cold if nobody visits for a week. A daily GitHub Actions keepalive cron (~1 min/month) solves this. See `process/version_strategy.md` for the keepalive workflow.

### Upstash Redis — 500K commands/month

**Equivalent to:** ~16K commands/day, or ~8K graph API calls/day (1 GET + 1 SET per miss).  
**Risk:** Very low. This is 50x more generous than the old 10K/day limit.

### Vercel Hobby — Non-commercial use only

**Risk:** If Cotagraph becomes a public-facing transparency tool used by journalists, this may violate the non-commercial clause. Upgrade path: Vercel Pro ($20/month) or migrate to Cloudflare Pages (free, no commercial restriction).

### GitHub Actions — 2,000 min/month

**Equivalent to:** ~67 CI runs of 30 minutes each, plus weekly ETL cron + daily keepalive.  
**Risk:** Low if path filters are configured correctly (only run backend tests on backend changes).

---

## Upgrade Paths

| Service | Trigger | Upgrade |
| --- | --- | --- |
| Neo4j AuraDB | Hit 200K combined | AuraDB Professional ($65/month) or Railway self-hosted |
| Supabase | Hit 500MB or need no-pause | Supabase Pro ($25/month) or migrate to Neon.tech |
| Upstash | Hit 500K commands/month | Upstash pay-as-you-go ($0.03/GB transfer) |
| Cloud Run | Need more memory/CPU | Cloud Run min-instances=1 (~$5/month) |
| GitHub Actions | Hit 2K min/month | Upgrade to GitHub Team or self-hosted runner |

---

## What We Deliberately Rejected

| Option | Why rejected |
| --- | --- |
| Heroku | No free tier since 2022 |
| Render (backend) | Free tier sleeps after 15 min — bad for an API |
| AWS Lambda | Poor fit for FastAPI connection pools; cold starts |
| Fly.io (for Neo4j) | 256MB free RAM — Neo4j needs 512MB minimum |
| Railway | $5/month credit — good fallback if Cloud Run setup fails |
| PlanetScale | MySQL, not PostgreSQL |
