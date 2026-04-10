---
id: process-version-strategy
title: "Version Strategy — Pinning, Verification, and Knowledge Gap Mitigation"
type: process
status: decided
tags: [versions, dependencies, pinning, verification, knowledge-gap, npm, pypi]
created: 2026-04-07
updated: 2026-04-07
summary: "Strategy for handling AI agent knowledge gaps on library versions and service pricing. Pin exact versions, verify before building, use web search for current state."
---

# Version Strategy

## The Problem

AI agents have knowledge cutoffs (typically 6-12 months behind). Libraries ship major versions, services change pricing, and free tiers get modified. An agent confidently recommending React 18 when 19.2 is current (with breaking changes) leads to bad code.

## Rules

### 1. Always Verify Before Building

Before writing any `package.json` or `pyproject.toml`, the agent MUST:

- WebSearch for `"{library} latest version {current_year}"` on pypi.org or npmjs.com
- Check the official changelog for breaking changes since the version the agent knows
- Verify free tier limits on the official pricing page (not from memory)

### 2. Pin Exact Versions

Never use `>=` or `^` in production. Pin exact versions:

```json
// package.json — exact versions
"react": "19.2.0",
"vite": "8.0.7"
```

```toml
# pyproject.toml — exact versions
fastapi = "0.135.3"
neo4j = "5.x.x"
```

Use a lockfile (`package-lock.json`, `uv.lock`) and commit it.

### 3. Version Registry (Last Verified)

Maintain a verified version registry so agents know what's current:

**Last verified: 2026-04-07**

| Library | Verified Version | Category |
| --- | --- | --- |
| React | 19.2.x | Frontend core |
| Vite | 8.0.7 | Build tool (Rolldown bundler, Node 20.19+) |
| TypeScript | 5.x | Type system |
| Cytoscape.js | 3.33.2 | Graph visualization |
| cytoscape-cose-bilkent | (verify before use) | Layout plugin |
| @tanstack/react-query | 5.x (verify) | Data fetching |
| zustand | 4.x or 5.x (verify) | State management |
| react-router-dom | 7.x (verify) | Routing |
| axios | 1.x (verify) | HTTP client |
| react-i18next | (verify) | i18n |
| FastAPI | 0.135.3 | Backend framework |
| uvicorn | (verify) | ASGI server |
| SQLAlchemy | 2.x (verify) | ORM |
| asyncpg | (verify) | PostgreSQL async driver |
| neo4j (Python) | 5.x (verify) | Neo4j driver |
| redis (Python) | (verify) | Redis client |
| pydantic | 2.x (verify) | Validation |
| alembic | (verify) | Migrations |
| pandas | 2.x (verify) | ETL data processing |
| rapidfuzz | (verify) | Fuzzy matching |
| pytest | 8.x (verify) | Testing |
| testcontainers | (verify) | DB test containers |
| playwright | (verify) | E2E testing |

### 4. Free Tier Registry (Last Verified)

**Last verified: 2026-04-07**

| Service | Free Limit (verified) | Key Changes from Initial Docs |
| --- | --- | --- |
| Neo4j AuraDB Free | **200K nodes+relationships combined** | Was 50K/175K — INCREASED |
| Supabase Free | 500MB, **pauses after 7 days inactivity** | Was "never sleeps" — CHANGED |
| Upstash Redis Free | **500K commands/month**, 256MB data | Was 10K/day — INCREASED |
| Vercel Hobby | 100GB bandwidth, **non-commercial use only** | Non-commercial restriction — NEW RISK |
| Google Cloud Run | 2M req/mo, 360K GB-sec | Slightly less memory than documented |
| Bonsai.io | Free sandbox (Elasticsearch) | Still available |
| GitHub Actions | 2000 min/month (private repos) | Unchanged |

### 5. React 19 Migration Notes

React 19 (released Dec 2024) has breaking changes from React 18:

- `forwardRef` removed — ref is now a regular prop on function components
- New `use()` hook — reads promises and context
- `useActionState` replaces `useFormState`
- JSX namespace moved — may cause TypeScript errors
- Ref callback cleanup — returning from ref callbacks is now an error

**Impact on our architecture:** Frontend component patterns in `architecture/frontend_components.md` should use React 19 idioms. No `forwardRef` in any component design.

### 6. Vite 8 Migration Notes

Vite 8 (released March 2026) ships Rolldown (Rust-based bundler):

- 10-30x faster builds
- Node 20.19+ or 22.12+ required
- Plugin compatibility: most Vite 5 plugins work, but verify
- Config API mostly unchanged

### 7. When to Re-Verify

- Before starting any new implementation phase
- Before adding a new dependency
- Monthly, as a maintenance task (add to GitHub Actions cron)
- After any agent flags a version uncertainty

### 8. Supabase Pause Mitigation

Supabase free tier pauses after 7 days of inactivity. Options:

**Chosen: Keepalive cron.** Add a daily GitHub Actions cron that pings the Supabase health endpoint. Costs ~1 min/month from our 2000 budget. Simple and reliable.

```yaml
# .github/workflows/keepalive.yml
on:
  schedule:
    - cron: '0 12 * * *'    # daily at noon UTC
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - run: curl -sf "${{ secrets.SUPABASE_URL }}/rest/v1/" -H "apikey: ${{ secrets.SUPABASE_ANON_KEY }}" > /dev/null
```
