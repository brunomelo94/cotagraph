---
id: data-sources
title: "Data Sources — External APIs and Local Files"
type: data
status: current
tags: [data-sources, api, camara, cgu, ibge, tse, csv, phase1]
related: [data/data_dictionary, data/etl_pipeline]
created: 2026-04-07
updated: 2026-04-07
summary: "All external data sources: Câmara API (deputies + CEAP), CGU Portal (amendments), IBGE (municipalities), TSE (elections). Includes URLs, formats, auth, and local file paths."
---

# Data Sources

## 1. Câmara dos Deputados — Open Data API

**Base URL:** `https://dadosabertos.camara.leg.br/api/v2/`  
**Auth:** None (public API)  
**Docs:** `https://dadosabertos.camara.leg.br/swagger/api.html`  
**Format:** JSON

### Key Endpoints

| Endpoint | What it returns |
| --- | --- |
| `GET /deputados` | List of all current deputies with IDs, names, party, state, photo |
| `GET /deputados/{id}` | Full deputy profile |
| `GET /deputados/{id}/despesas` | CEAP expenses for one deputy (paginated) |

**Key field:** `id` (integer) — the canonical Câmara ID for each deputy. Maps to `camara_id` in our schema.

### CEAP Annual Bulk Files

**URL pattern:** `http://www.camara.leg.br/cotas/Ano-{year}.csv.zip`  
**Years available:** 2009–2024  
**Format:** CSV inside ZIP  
**Size:** ~30–80MB unzipped per year  
**Auth:** None

**Key field in CEAP CSV:** `idecadastro` — this is the `camara_id`. Use this to link expenses to deputies without fuzzy name matching.

---

## 2. CGU — Portal da Transparência (Amendments)

**Portal:** `https://portaldatransparencia.gov.br/emendas/consulta`  
**Open data page:** `https://dados.gov.br/dataset?tags=Emendas+Parlamentares`  
**Auth:** None (public)  
**Cadence:** Published daily by CGU

### Local Files Already Downloaded

| File | Path | Size | Notes |
| --- | --- | --- | --- |
| Raw amendments (all) | `e:/Learning/TCC-MBA/rar_files/EmendasParlamentares/EmendasParlamentares.csv` | 39.4MB | Full raw dataset |
| By beneficiary (raw) | `e:/Learning/TCC-MBA/rar_files/EmendasParlamentares/EmendasParlamentares_PorFavorecido.csv` | 150MB | |
| By beneficiary (clean) | `e:/Learning/TCC-MBA/data/emendas_por_favorecido.csv` | 6.4MB | Cleaned |
| **By beneficiary + party** | **`e:/Learning/TCC-MBA/data/emendas_por_favorecido_partidos.csv`** | **6.7MB** | **PRIMARY SEED — use this first** |

The `_partidos` file has a `partido` column added by `src/insert_parties.py` using the JSON mapping.

---

## 3. IBGE — Brazilian Institute of Geography and Statistics

**API:** `https://servicodados.ibge.gov.br/api/v1/localidades/municipios`  
**Auth:** None  
**Format:** JSON  
**What it returns:** All 5,570 Brazilian municipalities with IBGE 7-digit codes, names, and state (UF)

Used to resolve municipality names to IBGE codes and build `:Municipality` + `:State` nodes.

---

## 4. TSE — Electoral Court (MBA Thesis Only)

**Portal:** `https://www.tse.jus.br/eleicoes/estatisticas/repositorio-de-dados-eleitorais`  
**Local file:** `e:/Learning/TCC-MBA/data/resultados_eleicoes.csv` (3.0MB)  
**Note:** Used in the MBA thesis for electoral outcome analysis. Not ingested by Cotagraph in Phase 1-2. May be added in Phase 3 to enrich deputy profiles with their re-election status.

---

## 5. Local Mapping Files

### Deputy Name → Party Mapping

**Path:** `e:/Learning/TCC-MBA/json_data/politicos_partidos_padronizado.json`  
**Format:** `{ "DEPUTY NAME UPPERCASE": "PARTY_ACRONYM" }`  
**Size:** 23.4KB, ~500+ deputies  
**Use:** Bridges the gap between CGU amendment CSV (uses name strings) and our schema (uses Câmara IDs). Used by `src/insert_parties.py` to add the `partido` column.

---

## Priority for Phase 1 ETL

1. **Start with** `emendas_por_favorecido_partidos.csv` — already clean, already has party. Load into Neo4j immediately without any API calls.
2. **Then** pull `GET /deputados` from Câmara API to get `camara_id` integers and photo URLs.
3. **Then** run fuzzy match to link amendment deputy names → `camara_id`.
4. **Then** pull IBGE municipalities for `:Municipality` nodes.
5. CEAP annual files come in Phase 2.
