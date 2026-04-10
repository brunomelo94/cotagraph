---
id: data-etl-pipeline
title: "ETL Pipeline — Ingestion Flow"
type: data
status: decided
tags: [etl, ingestion, pipeline, neo4j, postgresql, idempotency, phase1]
related: [data/data_sources, architecture/adr/ADR-007-ingestion-separation, diagrams/all_diagrams]
created: 2026-04-07
updated: 2026-04-07
summary: "Ingestion pipeline: normalize CSV data → UPSERT to PostgreSQL → UNWIND MERGE to Neo4j. GitHub Actions cron weekly. All operations idempotent. Separate Docker container."
---

# ETL Pipeline — Ingestion Flow

## Pipeline Files (in `ingestion/pipelines/`)

| File | Purpose | Phase |
| --- | --- | --- |
| `amendments_loader.py` | Load `emendas_por_favorecido_partidos.csv` → PG + Neo4j | **1 — build first** |
| `camara_api_client.py` | Fetch deputies master list from Câmara API | 1b |
| `ceap_downloader.py` | Download + unzip annual CEAP ZIP files | 2 |
| `ceap_parser.py` | Normalize CEAP CSV → PG + Neo4j | 2 |
| `ibge_loader.py` | Fetch municipality list from IBGE API | 1b |
| `neo4j_loader.py` | Bulk MERGE operations via UNWIND (shared utility) | 1 |

---

## Step-by-Step Flow (Phase 1: Amendments Only)

```
Step 1: Load Câmara API
  GET /deputados → normalize → UPSERT deputies table → sync_logs

Step 2: Load amendments seed CSV
  Read emendas_por_favorecido_partidos.csv
  → normalize CNPJ/CPF (strip formatting)
  → classify legal_nature
  → fuzzy match deputy name → camara_id
    (exact → rapidfuzz ≥85 → log unmatched)
  → filter Valor Pago > 0
  → UPSERT beneficiaries table
  → INSERT amendments table (ON CONFLICT DO NOTHING)
  → sync_logs (success/error + counts)

Step 3: Sync to Neo4j
  UNWIND deputies → MERGE (:Deputy {camara_id})
  UNWIND beneficiaries → MERGE (:Beneficiary {cnpj_cpf})
  UNWIND amendments → MERGE [:SENT_AMENDMENT] edge
  MERGE (:Party) + [:MEMBER_OF] edges
  MERGE (:State) + [:REPRESENTS] edges
  MERGE (:Municipality) + [:LOCATED_IN] edges (if IBGE loaded)
```

---

## Idempotency Rules

All pipeline operations must be safe to re-run without creating duplicates:

| Operation | Idempotency mechanism |
| --- | --- |
| PG deputies | `INSERT ... ON CONFLICT (camara_id) DO UPDATE` |
| PG beneficiaries | `INSERT ... ON CONFLICT (cnpj_cpf) DO UPDATE` |
| PG amendments | `INSERT ... ON CONFLICT (amendment_code) DO NOTHING` |
| Neo4j nodes | `MERGE (:Label {natural_key: $value})` |
| Neo4j edges | `MATCH (a), (b) WHERE ... MERGE (a)-[:TYPE {amendment_code: $code}]->(b)` |

If a pipeline run fails halfway, re-running from the start is always safe.

---

## Schedule

| Phase | Trigger | Frequency |
| --- | --- | --- |
| Phase 1 | Manual: `docker compose --profile ingestion run ingestion` | On demand |
| Phase 2 | GitHub Actions `workflow_dispatch` (manual trigger via UI) | On demand |
| Phase 3 (MVP prod) | GitHub Actions cron: `0 3 * * 1` (Monday 3am UTC) | Weekly |
| Phase 4 | Celery Beat + Redis broker | Configurable |

---

## Sync Log Schema

Every run writes to `sync_logs`:

```python
{
    "pipeline_name": "amendments_loader",
    "status": "success",           # running | success | error
    "records_upserted": 45230,
    "records_skipped": 120,        # zero-value Valor Pago
    "records_failed": 3,           # invalid CNPJ format
    "started_at": "2026-04-07T03:00:00Z",
    "finished_at": "2026-04-07T03:04:22Z",
    "error_message": null
}
```

---

## Running Locally

```bash
# Start all services
make up

# Run amendments loader (Phase 1 seed)
docker compose --profile ingestion run ingestion \
  python pipelines/amendments_loader.py

# Check what was loaded
docker compose exec backend \
  curl http://localhost:8000/api/v1/stats/summary
```
