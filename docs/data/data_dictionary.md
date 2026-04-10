---
id: data-dictionary
title: "Data Dictionary — Column Definitions"
type: data
status: current
tags: [data-dictionary, columns, schema, ceap, amendments, camara-api]
related: [data/data_sources, architecture/database_schema, architecture/graph_schema]
created: 2026-04-07
updated: 2026-04-08
summary: "Column-level definitions for every data source: amendments CSV (primary seed), CEAP annual files, Câmara API, and Neo4j node properties."
---

# Data Dictionary

## 1. `emendas_por_favorecido_partidos.csv` — Primary Seed

**Path:** `e:/Learning/TCC-MBA/data/emendas_por_favorecido_partidos.csv`  
**Source:** CGU Portal, enriched by `src/insert_parties.py`  
**Use:** Phase 1 seed. Load this first. No API calls required.

| Column | Type | Maps to | Notes |
| --- | --- | --- | --- |
| `Código da Emenda` | str | `amendments.amendment_code` | Float-formatted (e.g., `202445000000.0`). Cast to int before use. |
| `Código do Autor da Emenda` | int | `deputies.camara_id` | **Numeric Câmara ID** — direct join, no fuzzy match needed |
| `Nome do Autor da Emenda` | str | `deputies.name` | Display name. 808 unique names → 798 unique IDs (minor variants) |
| `Número da emenda` | int | — | Sequential number within the author's amendments |
| `Tipo de Emenda` | str | `amendments.amendment_type` | All rows: `"Emenda Individual - Transferências Especiais"` |
| `Ano/Mês` | int | `amendments.year` | Format: `YYYYMM` (e.g., `202412`). Extract year as `value // 100` |
| `Código do Favorecido` | str | `beneficiaries.cnpj_cpf` | **Natural key** — numeric CNPJ without punctuation. 5,434 unique. Zero-pad if < 14 digits |
| `Favorecido` | str | `beneficiaries.name` | Beneficiary name (e.g., `"ESTADO DE MINAS GERAIS"`) |
| `Natureza Jurídica` | str | `beneficiaries.legal_nature` | e.g., `"Estado ou Distrito Federal"`, `"Pessoa Jurídica"` |
| `Tipo Favorecido` | str | — | Always `"Pessoa Jurídica"` in current data |
| `UF Favorecido` | str | `beneficiaries.uf` | 2-letter state code of the beneficiary |
| `Município Favorecido` | str | `beneficiaries.municipality` | Municipality name. 5,154 unique. |
| `Valor Recebido` | int | `amendments.amount_brl` | **Canonical amount** — integer centavos (BRL). Use for graph edge weights. Total: R$ 20.7B |
| `siglaPartido` | str | `deputies.party` | Party acronym. 26 unique. Added by `src/insert_parties.py` |

**Profiling summary (2026-04-08):** 36,590 rows, 798 deputies, 5,434 beneficiaries, 8 zero-value rows (0.02%), 0 blank codes.

---

## 2. CEAP Annual Files (`Ano-{year}.csv`)

**URL:** `http://www.camara.leg.br/cotas/Ano-{year}.csv.zip`  
**Phase:** 2

| Column | Type | Maps to | Notes |
| --- | --- | --- | --- |
| `txNomeParlamentar` | str | `deputies.name` | Deputy name (string) |
| `cpf` | str | — | Deputy CPF |
| `idecadastro` | int | `deputies.camara_id` | **Direct Câmara ID — no fuzzy match needed** |
| `sgPartido` | str | `deputies.party` | Party acronym |
| `sgUF` | str | `deputies.state` | State code |
| `numLegislatura` | int | — | Legislature number (57 = 2023–2027) |
| `txtDescricao` | str | `ceap_expenses.expense_category` | Expense category |
| `txtDescricaoEspecificacao` | str | — | Subcategory |
| `txtFornecedor` | str | `beneficiaries.name` | Supplier name |
| `txtCNPJCPF` | str | `beneficiaries.cnpj_cpf` | Supplier CNPJ/CPF |
| `txtNumero` | str | `ceap_expenses.document_number` | NF or receipt number |
| `datEmissao` | date | `ceap_expenses.expense_date` | Document date |
| `vlrDocumento` | float | — | Face value |
| `vlrGlosa` | float | — | Amount disallowed |
| `vlrLiquido` | float | `ceap_expenses.net_value_brl` | **Canonical amount** — net reimbursed value |
| `numMes` | int | `ceap_expenses.month` | Month |
| `numAno` | int | `ceap_expenses.year` | Year |

---

## 3. Câmara API — `GET /deputados`

| Field | Type | Maps to | Notes |
| --- | --- | --- | --- |
| `id` | int | `deputies.camara_id` | **Canonical integer ID** |
| `nome` | str | `deputies.name` | Full name |
| `siglaPartido` | str | `deputies.party` | Current party |
| `siglaUf` | str | `deputies.state` | State |
| `idLegislatura` | int | — | Legislature (57 = current) |
| `urlFoto` | str | `deputies.photo_url` | Headshot image URL |
| `email` | str | — | Not stored |

---

## 4. IBGE API — `/localidades/municipios`

| Field | Type | Maps to | Notes |
| --- | --- | --- | --- |
| `id` | int | `municipalities.ibge_code` | 7-digit IBGE code (as string, padded) |
| `nome` | str | `municipalities.name` | Official municipality name |
| `microrregiao.mesorregiao.UF.sigla` | str | `municipalities.uf` | State 2-letter code |

---

## 5. Neo4j Node Properties Quick Reference

| Node | Natural key | Key properties |
| --- | --- | --- |
| `:Deputy` | `camara_id` (int) | `name`, `party`, `state`, `photo_url` |
| `:Beneficiary` | `cnpj_cpf` (str, 11 or 14 digits) | `name`, `legal_nature`, `uf`, `municipality` |
| `:Municipality` | `ibge_code` (str, 7 digits) | `name`, `uf` |
| `:Party` | `acronym` (str) | `full_name` |
| `:State` | `uf` (str, 2 letters) | `name` |

### `legal_nature` Values for `:Beneficiary`

| Value | Meaning |
| --- | --- |
| `PJ` | Private legal entity (CNPJ, 14 digits) |
| `PF` | Individual (CPF, 11 digits) |
| `Ente Público Municipal` | Municipal government |
| `Ente Público Estadual` | State government |
| `Ente Público Federal` | Federal entity |
| `unknown` | CNPJ/CPF missing or invalid |
