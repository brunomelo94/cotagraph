---
id: adr-009-testing-strategy
title: "ADR-009: TDD + BDD Testing Strategy"
type: adr
status: decided
tags: [testing, tdd, bdd, pytest, vitest, playwright, testcontainers, phase1]
related: [process/testing_strategy, process/cicd_pipeline]
created: 2026-04-07
updated: 2026-04-07
summary: "Three-layer testing pyramid: unit (pytest+vitest), integration (testcontainers with real DBs — no mocks), E2E/BDD (Playwright). No database mocking in integration tests."
---

# ADR-009: TDD + BDD Testing Strategy

## Status

Decided — 2026-04-07

## Context

The app has several critical correctness requirements: ETL pipelines must load data without duplicates, graph queries must return the right subgraph, and the frontend must render correctly after user interactions. We need a testing strategy that catches real failures without producing false confidence.

## Decision

Three-layer pyramid:

| Layer | Coverage target | Tools | What is mocked |
| --- | --- | --- | --- |
| Unit | 70% | pytest, vitest, React Testing Library | Service layer (not DBs) |
| Integration | 20% | pytest, testcontainers-python | Nothing — real DBs |
| E2E / BDD | 10% | Playwright | Nothing — real staging env |

**Hard rule: Do not mock databases in integration tests.**

## Rationale

- **Real DBs in integration tests:** Mock databases produce false positives. A test that passes against a mock Neo4j driver can fail against a real one due to Cypher syntax errors, constraint violations, or driver version mismatches. `testcontainers-python` spins up real PostgreSQL and Neo4j Docker containers per test session — tests are slower but trustworthy.
- **Playwright for BDD:** User journey scenarios are written in plain language and executed against a real staging environment. This catches integration failures between frontend and backend that unit tests cannot see.
- **Unit tests mock the service layer, not the DB layer:** FastAPI route handlers are tested with a mocked `graph_service` — this is correct because we're testing routing logic, not graph queries. Graph queries are tested in integration tests.

## Alternatives Considered

| Option | Rejected because |
| --- | --- |
| Mock all databases everywhere | Prior experience: mock/prod divergence causes false positives; real DB behavior differs in constraint enforcement and driver quirks |
| Only E2E tests | Too slow to run on every commit; doesn't give fast feedback |
| No E2E tests | Missing the user journey layer — component tests can't catch API contract mismatches |

## Consequences

- Integration tests require Docker to be running (not a problem in CI or local dev)
- Test suite is slower than fully-mocked alternatives — accepted trade-off for trustworthiness
- `testcontainers-python` must be in `ingestion/` and `backend/` dev dependencies
- Playwright tests run against staging only (not localhost) in CI — requires a staging environment (Phase 2)
