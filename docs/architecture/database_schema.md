---
id: arch-database-schema
title: "Database Schema — PostgreSQL Source of Truth"
type: architecture
status: decided
tags: [postgresql, database, schema, erd, migrations, phase1]
related: [architecture/adr/ADR-002-postgresql, architecture/graph_schema]
created: 2026-04-07
updated: 2026-04-07
summary: "PostgreSQL schema: 5 tables (deputies, beneficiaries, municipalities, amendments, ceap_expenses, sync_logs). Source of truth; Neo4j is derived from this."
---

# Database Schema — PostgreSQL

PostgreSQL is the **source of truth**. Neo4j is always derivable from it. Never write to Neo4j without first writing to PostgreSQL.

## Tables

### `deputies`

Master list of federal deputies. Populated from Câmara API `/deputados`.

```sql
CREATE TABLE deputies (
    id          SERIAL PRIMARY KEY,
    camara_id   INTEGER UNIQUE NOT NULL,   -- Câmara API id / CEAP idecadastro
    name        VARCHAR(255) NOT NULL,
    party       VARCHAR(20),
    state       VARCHAR(2),                -- 2-letter UF
    photo_url   TEXT,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_deputies_party ON deputies(party);
CREATE INDEX idx_deputies_state ON deputies(state);
```

### `beneficiaries`

All entities that receive money (municipalities, contractors, individuals, state governments).

```sql
CREATE TABLE beneficiaries (
    id             SERIAL PRIMARY KEY,
    cnpj_cpf       VARCHAR(14) UNIQUE NOT NULL,  -- stripped of formatting
    name           VARCHAR(500) NOT NULL,
    legal_nature   VARCHAR(50),   -- 'PJ' | 'PF' | 'Ente Público Municipal' | ...
    uf             VARCHAR(2),
    municipality   VARCHAR(255),
    created_at     TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_beneficiaries_uf ON beneficiaries(uf);
CREATE INDEX idx_beneficiaries_legal_nature ON beneficiaries(legal_nature);
```

### `municipalities`

IBGE municipality master list (5,570 municipalities).

```sql
CREATE TABLE municipalities (
    id          SERIAL PRIMARY KEY,
    ibge_code   VARCHAR(7) UNIQUE NOT NULL,
    name        VARCHAR(255) NOT NULL,
    uf          VARCHAR(2) NOT NULL
);
```

### `amendments`

Budget amendments (Emendas Parlamentares) from CGU.

```sql
CREATE TABLE amendments (
    id                   SERIAL PRIMARY KEY,
    amendment_code       VARCHAR(30) UNIQUE NOT NULL,
    deputy_id            INTEGER REFERENCES deputies(id),
    beneficiary_id       INTEGER REFERENCES beneficiaries(id),
    amendment_type       VARCHAR(150),
    amount_paid_brl      DECIMAL(14, 2) NOT NULL,
    amount_committed_brl DECIMAL(14, 2),
    year                 INTEGER NOT NULL,
    policy_area          VARCHAR(150),
    source_file          VARCHAR(255)   -- which CSV file loaded this row
);
CREATE INDEX idx_amendments_deputy_id ON amendments(deputy_id);
CREATE INDEX idx_amendments_year ON amendments(year);
CREATE INDEX idx_amendments_beneficiary_id ON amendments(beneficiary_id);
```

### `ceap_expenses`

CEAP parliamentary allowance expenses from Câmara annual ZIP files.

```sql
CREATE TABLE ceap_expenses (
    id               SERIAL PRIMARY KEY,
    deputy_id        INTEGER REFERENCES deputies(id),
    beneficiary_id   INTEGER REFERENCES beneficiaries(id),
    expense_category VARCHAR(150),     -- ALIMENTAÇÃO, PASSAGEM AÉREA, etc.
    net_value_brl    DECIMAL(14, 2) NOT NULL,
    expense_date     DATE,
    year             INTEGER NOT NULL,
    month            INTEGER,
    document_number  VARCHAR(100),
    raw_data         JSONB             -- full original CSV row for audit
);
CREATE INDEX idx_ceap_deputy_id ON ceap_expenses(deputy_id);
CREATE INDEX idx_ceap_year_month ON ceap_expenses(year, month);
```

### `sync_logs`

ETL run audit trail. Every ingestion run writes a record here.

```sql
CREATE TABLE sync_logs (
    id                SERIAL PRIMARY KEY,
    pipeline_name     VARCHAR(100) NOT NULL,  -- 'amendments_loader', 'ceap_downloader', etc.
    status            VARCHAR(20) NOT NULL,   -- 'running' | 'success' | 'error'
    records_upserted  INTEGER DEFAULT 0,
    records_skipped   INTEGER DEFAULT 0,
    records_failed    INTEGER DEFAULT 0,
    started_at        TIMESTAMPTZ DEFAULT now(),
    finished_at       TIMESTAMPTZ,
    error_message     TEXT                    -- null on success
);
```

---

## Migration Strategy

Managed with **Alembic** (Python). Migrations live in `backend/alembic/versions/`.

```bash
# Create a new migration
alembic revision --autogenerate -m "description"

# Apply all pending migrations
alembic upgrade head

# Roll back one migration
alembic downgrade -1
```

Migration files are committed to git. The database schema is never modified manually in production.

---

## Relationship to Neo4j

PostgreSQL rows map to Neo4j nodes and edges as follows:

| PostgreSQL | Neo4j |
| --- | --- |
| `deputies` row | `(:Deputy)` node |
| `beneficiaries` row | `(:Beneficiary)` node |
| `municipalities` row | `(:Municipality)` node |
| `amendments` row | `[:SENT_AMENDMENT]` edge |
| `ceap_expenses` row | `[:SPENT_ON]` edge |
| `deputies.party` | `(:Party)` node + `[:MEMBER_OF]` edge |
| `deputies.state` | `(:State)` node + `[:REPRESENTS]` edge |

Neo4j is rebuilt from PostgreSQL using `ingestion/pipelines/neo4j_loader.py` with `UNWIND` + `MERGE`.
