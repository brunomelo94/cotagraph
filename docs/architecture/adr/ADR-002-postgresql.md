---
id: adr-002-postgresql
title: "ADR-002: PostgreSQL as Source of Truth Alongside Neo4j"
type: adr
status: decided
tags: [postgresql, database, source-of-truth, etl, migrations]
related: [adr-001-neo4j, architecture/database_schema]
created: 2026-04-07
updated: 2026-04-07
summary: "Raw data lives in PostgreSQL. Neo4j is always derivable from it. Supabase free tier (500MB) for production."
---

# ADR-002: PostgreSQL as Source of Truth Alongside Neo4j

## Status

Decided — 2026-04-07

## Context

We need Neo4j for graph traversal, but Neo4j has no schema versioning, no FK constraints, and no easy audit trail. If Neo4j gets corrupted or needs a full reload, we need a reliable base to rebuild from.

## Decision

All raw ingested data is written to PostgreSQL first (UPSERT). Neo4j is then derived from PostgreSQL via UNWIND MERGE. Never write to Neo4j without writing to PostgreSQL first.

## Rationale

- **Rebuildable:** Neo4j can be dropped and rebuilt from PostgreSQL at any time. This happened multiple times during development of similar systems.
- **ACID guarantees:** Foreign key constraints prevent orphaned amendment records. PostgreSQL transactions prevent partial writes.
- **Alembic migrations:** Schema changes are versioned and reversible. No manual `ALTER TABLE` in production.
- **ETL audit trail:** `sync_logs` table records every pipeline run — what succeeded, what failed, how many records. Essential for debugging ingestion issues.
- **Supabase free tier:** 500MB PostgreSQL, never sleeps, region `sa-east-1` (Brazil). Free forever.

## Alternatives Considered

| Option | Rejected because |
| --- | --- |
| Neo4j only (no PostgreSQL) | No schema versioning, hard to audit, risky single point of failure |
| MongoDB alongside Neo4j | Document store adds no value here; relational model fits the data |

## Consequences

- Two databases to maintain — accepted; PostgreSQL is low-maintenance on Supabase
- 500MB free limit — ~2-3 years of amendment data should fit; monitor usage
- All ETL pipelines must write PostgreSQL first, then Neo4j — enforced by pipeline design
