---
id: index
title: "Document Index — Cotagraph"
type: context
status: current
tags: [index, navigation]
updated: 2026-04-07
summary: "Master index of all documentation files in cotagraph/docs/. One-line description per file."
---

# Cotagraph — Document Index

Start with `AGENT_START_HERE.md`. Every other file is listed below.

---

## Entry Points

| File | Description |
| --- | --- |
| `AGENT_START_HERE.md` | First file every agent reads. Routes by agent type. Hard rules. |
| `INDEX.md` | This file. |

---

## context/

| File | Description |
| --- | --- |
| `context/project_overview.md` | What Cotagraph is, why it exists, who uses it. |
| `context/status.md` | **Living doc.** Current phase, done/in-progress/blocked, open questions. |
| `context/roadmap.md` | Four phases with milestones and scope boundaries. |

---

## architecture/

| File | Description |
| --- | --- |
| `architecture/system_overview.md` | Layered component diagram and narrative for the full system. |
| `architecture/graph_schema.md` | Neo4j node types, edge types, properties, and key Cypher patterns. |
| `architecture/database_schema.md` | PostgreSQL tables, ERD, constraints, and migration strategy. |
| `architecture/api_contracts.md` | All REST endpoints: params, response shapes, error codes. |
| `architecture/frontend_components.md` | Component tree, routing, Zustand store shape, TanStack Query usage. |

### architecture/adr/

| File | Description |
| --- | --- |
| `architecture/adr/ADR-001-neo4j.md` | Neo4j chosen over PostgreSQL CTEs for graph traversal. |
| `architecture/adr/ADR-002-postgresql.md` | PostgreSQL as source of truth alongside Neo4j. |
| `architecture/adr/ADR-003-fastapi.md` | FastAPI chosen over Django, Flask, Node.js. |
| `architecture/adr/ADR-004-react-vite.md` | React + Vite + TypeScript chosen over Angular. |
| `architecture/adr/ADR-005-cytoscapejs.md` | Cytoscape.js chosen over D3-force and vis-network. |
| `architecture/adr/ADR-006-search-first-ux.md` | Search-first UX: empty graph on load, progressive disclosure. |
| `architecture/adr/ADR-007-ingestion-separation.md` | ETL runs as a separate Docker container. |
| `architecture/adr/ADR-008-free-tier-cloud.md` | Chosen free-tier cloud stack: Vercel, Cloud Run, Supabase, AuraDB, Upstash. |
| `architecture/adr/ADR-009-testing-strategy.md` | TDD/BDD layers: unit + integration (real DBs via testcontainers) + E2E Playwright. |

---

## data/

| File | Description |
| --- | --- |
| `data/data_sources.md` | All external APIs and local CSV files with URLs, formats, and auth notes. |
| `data/data_dictionary.md` | Column-level definitions for every data source used by the app. |
| `data/data_quality.md` | Known data quality issues: fuzzy match problem, gaps, zero-value records. |
| `data/etl_pipeline.md` | Ingestion flow from source to Neo4j: steps, schedule, idempotency. |

---

## infrastructure/

| File | Description |
| --- | --- |
| `infrastructure/free_tier_stack.md` | Chosen free-tier services, usage limits, and upgrade paths. |
| `infrastructure/local_dev.md` | How to run the full stack locally with Docker Compose. |
| `infrastructure/deployment.md` | Cloud deployment steps for Cloud Run and Vercel. |

---

## diagrams/

| File | Description |
| --- | --- |
| `diagrams/all_diagrams.md` | All 9 Mermaid diagrams: logical arch, ERD, graph model, ETL, deployment, CI/CD, sequence, components, user journey. |

---

## process/

| File | Description |
| --- | --- |
| `process/testing_strategy.md` | Unit / integration / E2E layers, tools, fixtures, and the no-DB-mock rule. |
| `process/cicd_pipeline.md` | GitHub Actions CI/CD workflow, branch strategy, environment promotion. |
| `process/collaboration.md` | How Bruno works: design-first, save everything, cost-zero constraint. |
| `process/localization.md` | Language decision: English for code/docs, Portuguese for frontend UI. i18n plan. |
| `process/version_strategy.md` | Version pinning, free-tier verification, and AI knowledge-gap mitigation. Verified registry. |
