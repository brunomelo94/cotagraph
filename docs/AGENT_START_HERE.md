---
id: agent-start-here
title: "Agent Onboarding — Start Here"
type: context
status: current
tags: [onboarding, agents, routing, entry-point]
updated: 2026-04-07
summary: "Entry point for all AI agents working on Cotagraph. Routes to relevant docs by agent type. Read this first, always."
---

# Cotagraph — Agent Start Here

Cotagraph is a full-stack web application that visualizes how Brazilian federal deputies spend public money, connecting deputies (senders) to municipalities, contractors, and state entities (receivers) via an interactive graph. It tracks two spending types: CEAP parliamentary expenses and Emendas Parlamentares (budget amendments).

**Current phase:** Design. No application code has been written yet.  
**Stack:** FastAPI + Neo4j + PostgreSQL + Redis + React + Vite + Cytoscape.js  
**Language rule:** All code, docs, and agent communication in English. Frontend user-facing text in Portuguese (i18n planned via react-i18next).

---

## Route by Agent Type

| Agent type | Read first |
| --- | --- |
| Backend | `architecture/graph_schema.md` → `architecture/api_contracts.md` → `architecture/adr/` |
| Frontend | `architecture/frontend_components.md` → `diagrams/all_diagrams.md` |
| Data / ETL | `data/data_dictionary.md` → `data/data_sources.md` → `data/etl_pipeline.md` |
| Infrastructure | `infrastructure/free_tier_stack.md` → `infrastructure/deployment.md` |
| Any agent | Always check `context/status.md` for open questions before starting work |

---

## Hard Rules for All Agents

- Do not write application code until `context/status.md` shows phase **Implementation**
- Do not override a decided ADR — add a new ADR that supersedes it instead
- Do not commit secrets — environment variables only, see `infrastructure/local_dev.md`
- Do not mock databases in integration tests — see `process/testing_strategy.md`
- Do not change `INDEX.md` manually — it is regenerated when files are added

---

## Key Entry Points

| Need | File |
| --- | --- |
| Why was X chosen? | `architecture/adr/ADR-00N-*.md` |
| What is the current state? | `context/status.md` |
| What does column X mean? | `data/data_dictionary.md` |
| Where does data come from? | `data/data_sources.md` |
| What does the system look like? | `diagrams/all_diagrams.md` |
| How do I run this locally? | `infrastructure/local_dev.md` |
| How should I work with Bruno? | `process/collaboration.md` |
