---
id: ctx-status
title: "Current Status — Cotagraph"
type: context
status: current
tags: [status, living-doc, progress, open-questions]
created: 2026-04-07
updated: 2026-04-07
summary: "Living document. Current project phase, what is done, in progress, blocked, and open questions agents must check before starting work."
---

# Current Status — Cotagraph

**Last updated:** 2026-04-08  
**Phase:** Design — no application code written yet

---

## Done

- [x] Architecture decisions finalized (see `architecture/adr/`)
- [x] Graph schema designed (Neo4j nodes + edges)
- [x] PostgreSQL schema designed (5 tables)
- [x] API endpoints specified (`architecture/api_contracts.md`)
- [x] Free-tier cloud stack chosen (`infrastructure/free_tier_stack.md`)
- [x] CI/CD pipeline designed (`process/cicd_pipeline.md`)
- [x] TDD/BDD strategy defined (`process/testing_strategy.md`)
- [x] Document library structure created (`docs/` with atomic files + frontmatter)
- [x] All 9 Mermaid diagrams created (`diagrams/all_diagrams.md`)
- [x] Q1 resolved: Neo4j feasibility verified — 46,973 / 200,000 (23.5%)
- [x] Q3 largely resolved: CSV has numeric Câmara IDs — no fuzzy match needed for amendments
- [x] Dev machine setup: Python 3.13.12, Node.js 24.14.1 LTS, npm 11.11.0

---

## In Progress

- [x] All 3 open questions resolved (Q1 feasibility, Q2 freshness, Q3 fuzzy match)
- [ ] Document library migration from `memory/` to `docs/` — in progress

---

## Blocked / Not Started

- [ ] Phase 1 scaffold (Docker Compose + folder structure) — waiting on design sign-off
- [ ] amendments_loader.py — first ETL pipeline
- [ ] FastAPI backend
- [ ] React frontend

---

## Open Questions (critical — must resolve before Phase 1)

### Q1: Neo4j node count feasibility — RESOLVED

**Question:** Does the 2024 amendments data fit within AuraDB Free (**200K nodes+relationships combined**)?

**Answer: YES — fits easily at 23.5% capacity (46,973 / 200,000).**

| Entity | Count |
| --- | --- |
| Deputies (unique IDs) | 798 |
| Beneficiaries (unique codes) | 5,434 |
| Parties | 26 |
| States (UF) | 27 |
| Municipalities | 5,154 |
| **Total nodes** | **11,439** |
| SENT_AMENDMENT edges (unique dep-ben pairs) | 23,350 |
| MEMBER_OF + REPRESENTS + LOCATED_IN + PART_OF | 12,184 |
| **Total relationships** | **35,534** |
| **Combined (nodes + rels)** | **46,973** |
| **Headroom remaining** | **153,027 (76.5%)** |

**Additional findings (2026-04-08):**

- All 36,590 rows are "Emenda Individual - Transferências Especiais" (one amendment type)
- Total value: R$ 20.7 billion
- Only 8 rows with zero value, 0 blank beneficiary codes — very clean data
- Deputy IDs are already numeric Câmara IDs (`Código do Autor da Emenda`) — see Q3 impact
- Even adding CEAP data in Phase 2 will stay well within 200K

**Status:** Resolved — 2026-04-08. AuraDB Free is confirmed viable.

---

### Q2: Data freshness SLA — RESOLVED

**Question:** CGU publishes amendments data daily. Is a weekly GitHub Actions cron acceptable for MVP, or does the product need fresher data?

**Answer: Daily cron via GitHub Actions, with a quality gate.**

The pipeline runs daily, downloads fresh data from CGU, but **does not load** until it passes validation checks (CNPJ checksum, value reconciliation, row count drift ≤ 20%). If checks fail, load is skipped and a GitHub Issue is auto-created. Priority is data quality and integrity over raw speed.

**Rationale:** Daily is simple with GitHub Actions (no Celery/worker needed). The quality gate prevents bad data from entering the graph. See `data/data_quality.md` section C for full integrity strategy.

**Status:** Resolved — 2026-04-08.

---

### Q3: Fuzzy match quality floor — LARGELY RESOLVED

**Question:** What percentage of unmatched amendment records (deputy name → Câmara ID) is acceptable before the graph becomes misleading?

**Answer: The CSV already contains `Código do Autor da Emenda` — numeric Câmara IDs (e.g., 4497, 4378). No fuzzy matching needed for the primary join.**

**Remaining minor issue:** 808 unique deputy names map to 798 unique IDs (10-name discrepancy). Likely causes: name variants for the same deputy, or deputies who changed names. This is trivial — a simple GROUP BY on ID resolves it.

**Impact:** The fuzzy match problem described in `data/data_quality.md` does NOT apply to the amendments CSV. It may still apply if we try to match deputies across other data sources (e.g., CEAP files that use names without IDs). For MVP, this is a non-issue.

**Status:** Resolved for amendments data — 2026-04-08. Re-evaluate when adding CEAP data in Phase 2.

---

## Next Action

All 3 critical questions resolved. Design sign-off unblocks Phase 1 scaffold (Docker Compose + folder structure + first ETL pipeline).
