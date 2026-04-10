---
id: data-quality
title: "Data Quality, Compliance & Integrity"
type: data
status: current
tags: [data-quality, data-integrity, compliance, lgpd, cnpj, validation, phase1]
related: [data/data_sources, data/data_dictionary, context/status]
created: 2026-04-07
updated: 2026-04-08
summary: "Data quality validation results, compliance decisions (LGPD, CGU license), and integrity strategy. All based on CSV profiling of emendas_por_favorecido_partidos.csv (36,590 rows, 2026-04-08)."
---

## A. Data Quality — Validation Results (2026-04-08)

### A1. CNPJ Validation — ALL VALID

**Finding:** All 5,434 unique `Código do Favorecido` values pass the CNPJ modulo-11 checksum after zero-padding to 14 digits. Zero invalid codes. Zero CPFs. All beneficiaries are `Pessoa Jurídica`.

**Code length distribution:** 9 digits (1), 10 digits (9), 11 digits (6), 12 digits (25), 13 digits (1,780), 14 digits (3,613).

**Decision:** Left zero-pad all codes to 14 digits in ETL. No records need to be dropped for invalid codes.

---

### A2. Valor Recebido Unit — CENTAVOS

**Finding:** Values are integers representing centavos (1/100 of BRL).

- Grand total as reais: R$ 2 trillion (absurd)
- Grand total as centavos: **R$ 20.7 billion** (matches known 2024 individual amendments budget)
- Largest single row: R$ 17.2M (Município de Macapá) — plausible for a municipal transfer

**Decision:** Divide by 100 in ETL. Store as `DECIMAL(15,2)` in PostgreSQL, as float in Neo4j edge properties.

---

### A3. Deputy Name/ID Discrepancy — TRIVIAL

**Finding:** 808 unique names map to 798 unique IDs. Two separate issues:

1. **5 names map to 2 IDs each** — deputies who served multiple legislatures (different `camara_id` per term):

   - "ALAN RICK" → IDs 3036, 4394
   - "BETO FARO" → IDs 2152, 4266
   - "ATILA LIRA" → IDs 1935, 4309
   - "EFRAIM FILHO" → IDs 2449, 4270
   - "LAERCIO OLIVEIRA" → IDs 2608, 4274

2. **15 IDs map to 2 name variants** — typos, abbreviations, name changes:

   - ID 4181: "NELSINHO TRAD" / "NELSINHO TRAD FILHO"
   - ID 3924: "JUNIO AMARAL" / "CABO JUNIO AMARAL"
   - ID 2532: "PAULO PEREIRA DA SILVA" / "PAULINHO DA FORCA"
   - (10 more similar cases)

**Decision:**

- Group by `Código do Autor da Emenda` (ID), not name.
- Use the most frequent name as canonical display name.
- Store all variants in a `name_aliases` text array (for search/autocomplete).
- Multi-legislature deputies: treat each `camara_id` as a separate node. They are technically different mandates.

---

### A4. Código da Emenda — NOT A PER-ROW KEY

**Finding:** Only **168 unique** `Código da Emenda` values across 36,590 rows. This is a budget program/type code (e.g., `202443000000.0`), not a unique amendment identifier. Multiple deputies send money to multiple beneficiaries under the same emenda code.

**Decision:** The natural key for a row (and for Neo4j edge deduplication) is the composite: `(Código do Autor da Emenda, Código do Favorecido, Código da Emenda, Ano/Mês)`. Use this as the `MERGE` key when creating `:SENT_AMENDMENT` edges.

---

### A5. Zero-Value Rows — NEGLIGIBLE

**Finding:** 8 out of 36,590 rows (0.02%) have `Valor Recebido = 0`. No negative values.

**Decision:** Filter `Valor Recebido <= 0` before loading. 8 rows is negligible.

---

### A6. Beneficiary Deduplication

**Strategy unchanged:** CNPJ (zero-padded to 14 digits) is the natural key. Two records with the same CNPJ but different names: keep the longest name as canonical. Log discrepancies.

---

### A7. State Governments as Beneficiaries

**Strategy unchanged:** Top beneficiaries include state governments (e.g., "ESTADO DE MINAS GERAIS", "ESTADO DA BAHIA"). Classify by `Natureza Jurídica` (e.g., `"Estado ou Distrito Federal"`). They remain `:Beneficiary` nodes linked to `:State` via `:LOCATED_IN`.

---

## B. Data Compliance

### B1. LGPD (Lei Geral de Proteção de Dados) — LOW RISK

**Finding:** The amendments CSV contains **zero CPFs**. All 5,434 beneficiaries are `Pessoa Jurídica` (legal entities identified by CNPJ). CNPJs are not personal data under LGPD.

**Phase 2 concern (CEAP data):** CEAP expense files include supplier CPFs. When we add CEAP data:

- **Frontend:** Mask CPFs — display as `XXX.456.789-XX` (show only middle digits)
- **Backend:** Store full CPF for deduplication and joins
- **Legal basis:** CGU/AGU Parecer 00006/2025 establishes that transparency is the rule and suppression the exception, but proportionality applies. Masking satisfies both principles.

**Decision for MVP:** No LGPD action needed — no personal data in amendments dataset. Add CPF masking when CEAP is integrated in Phase 2.

### B2. CGU Data License — NO RESTRICTIONS

**Finding (from [Portal da Transparência Terms of Use](https://portaldatransparencia.gov.br/termos-de-uso)):**

- No formal license (no Creative Commons, no specific open data license)
- No attribution requirement
- No commercial use restriction
- Data is freely available under Brazil's open data policy (Decreto 8.777/2016)
- Access requires no authentication

**Decision:** No legal obligation to attribute, but we add a source footer anyway:

> Fonte dos dados: [Portal da Transparência do Governo Federal (CGU)](https://portaldatransparencia.gov.br/) e [Dados Abertos da Câmara dos Deputados](https://dadosabertos.camara.leg.br/)

This builds credibility and is standard practice for transparency tools.

### B3. Câmara API — PUBLIC, RATE-LIMITED

- No auth required
- No terms restricting republication
- Rate-limited (undocumented threshold)

**Decision:** Cache Câmara API responses in Redis (Upstash). Respect rate limits with exponential backoff in the API client. No compliance issue.

---

## C. Data Integrity Strategy

### C1. Reconciliation Checks (post-load validation)

After every ETL run, verify:

| Check | Query | Expected |
| --- | --- | --- |
| Row count | `COUNT(*)` in PostgreSQL `amendments` table | Must equal CSV row count minus zero-value rows |
| Total value | `SUM(amount_brl)` in PostgreSQL | Must equal CSV total (R$ 20,695,281,025.25) |
| Neo4j node count | `MATCH (n) RETURN count(n)` | Must equal PostgreSQL distinct deputies + beneficiaries + parties + states + municipalities |
| Neo4j edge value | `MATCH ()-[r:SENT_AMENDMENT]->() RETURN sum(r.amount_brl)` | Must equal PostgreSQL `SUM(amount_brl)` |
| Orphan edges | `MATCH ()-[r]->() WHERE NOT exists(startNode(r)) OR NOT exists(endNode(r))` | Must be 0 |

If any check fails, the ETL logs an error to `sync_logs` with `status='reconciliation_failed'` and does **not** mark the run as successful.

### C2. Idempotency

- **Nodes:** `MERGE` on natural key (`camara_id` for deputies, zero-padded CNPJ for beneficiaries, `uf` for states, etc.)
- **Edges:** `MERGE` on composite key `(deputy_id, beneficiary_code, emenda_code, year_month)` — prevents duplicates if ETL is re-run
- **PostgreSQL:** `INSERT ... ON CONFLICT DO UPDATE` (upsert) on the same composite keys

### C3. Audit Trail

Every ETL run writes to `sync_logs`:

```text
pipeline_name, started_at, finished_at, status,
rows_read, rows_loaded, rows_skipped, rows_errored,
nodes_created, edges_created, total_value_loaded,
error_message (if any)
```

### C4. Drift Detection (daily cron)

When refreshing data from CGU:

- Compare new CSV row count vs. previous run
- Compare new total value vs. previous run
- If delta > 20% on either metric: **skip load**, create a GitHub Issue via `gh issue create`, and alert via sync_log

This prevents loading corrupted or truncated source files.

---

## Summary Table

| Concern | Status | Decision |
| --- | --- | --- |
| CNPJ validation | All 5,434 valid | Zero-pad to 14 digits, no drops needed |
| Valor unit | Centavos | Divide by 100, store as DECIMAL(15,2) |
| Amendment key | Not per-row | Composite key: (deputy_id, ben_code, emenda_code, year_month) |
| Deputy names | 15 variants | Group by ID, canonical name = most frequent |
| Multi-legislature | 5 deputies | Separate nodes per camara_id |
| Zero values | 8 rows (0.02%) | Filter out |
| LGPD/CPF | No CPFs in data | No action for MVP; mask CPFs in Phase 2 (CEAP) |
| CGU license | No restrictions | Add attribution footer (best practice) |
| Reconciliation | Designed | Post-load checks on counts and totals |
| Idempotency | Designed | MERGE on natural keys |
| Audit trail | Designed | sync_logs table |
| Drift detection | Designed | 20% threshold, auto-skip + GitHub Issue |
