---
id: process-collaboration
title: "Collaboration Guide — How to Work with Bruno"
type: process
status: current
tags: [collaboration, agents, design-first, conventions, cost, language]
created: 2026-04-07
updated: 2026-04-07
summary: "How Bruno works and what agents must respect: design before code, save everything to docs/ immediately, cost-zero constraint, English for all code and docs."
---

# Collaboration Guide

Rules for AI agents working on Cotagraph with Bruno.

---

## Design Before Code

**Rule:** Do not write application code until `context/status.md` shows phase **Implementation**.

**Why:** Bruno wants everything mentally modeled before committing to implementation. Prior "trash apps" were built without upfront design. Every architectural decision must be debated and documented in `architecture/adr/` before the first line of code is written.

**How to apply:** In design sessions, respond with diagrams, trade-off tables, and questions — not code. Present multiple options with rationale. Wait for explicit approval before building.

---

## Save Everything to `docs/` Immediately

**Rule:** Any decision, diagram, data finding, or architectural rationale produced in a session must be written to a file in `cotagraph/docs/` in the same response where it appears.

**Why:** Chat history is ephemeral. Multiple agents work on this project across sessions. If it's not in `docs/`, it doesn't exist. Bruno explicitly called this out: "keeping info only in chat here is useless."

**How to apply:**

- Mermaid diagrams → `docs/diagrams/all_diagrams.md`
- New architectural decision → new file in `docs/architecture/adr/`
- Data quality finding → `docs/data/data_quality.md`
- Status change → update `docs/context/status.md`
- New ADR → also update `docs/INDEX.md`

---

## ADRs Are Immutable Once Decided

**Rule:** Do not modify a decided ADR. Add a new ADR that supersedes it.

**Why:** Decisions have context at the time they're made. Overwriting loses that history. A superseding ADR explains what changed and why.

**Format:** `status: superseded-by-ADR-010` in the old ADR front matter, new ADR in `docs/architecture/adr/ADR-010-*.md`.

---

## Cost Constraint Is Hard

**Rule:** Infrastructure must cost $0/month in Phase 1–2. Propose free-tier alternatives before paid services.

**Why:** This is Bruno's personal/portfolio project. "Always aim for close to free" is a hard requirement, not a preference.

**See:** `infrastructure/free_tier_stack.md` for chosen services.

---

## Language

**Rule:**

- All code: English (variable names, function names, comments, commit messages)
- All documentation in `docs/`: English
- All agent communication: English
- Frontend user-facing text: Portuguese (to be implemented via react-i18next in Phase 3)
- Database values: preserve original language (Brazilian government data is in Portuguese)

**See:** `process/localization.md` for full i18n plan.

---

## Do Not Mock Databases in Integration Tests

**Rule:** Integration tests must use real PostgreSQL and Neo4j containers via `testcontainers-python`. No mocks.

**Why:** Mock/prod divergence caused false positives in prior experience. Real DB behavior differs in constraint enforcement and driver behavior.

**See:** `process/testing_strategy.md` for full testing strategy.

---

## Debate Piece by Piece

**Rule:** When presenting architecture options, present them one section at a time and wait for Bruno's input before moving to the next.

**Why:** Bruno actively participates in each architectural decision. Architecture is a conversation, not a document to hand over.

---

## GitHub PAT

A GitHub Personal Access Token is stored in `cotagraph/project.md` for agent use during development. Use it when GitHub API access is needed. Do not flag it as a security issue in code review — Bruno is aware. Remind him to move it to `.env` when Phase 1 implementation begins.
