---
id: diagrams-all
title: "System Diagrams — All Mermaid Diagrams"
type: diagram
status: current
tags: [diagrams, mermaid, architecture, erd, sequence, cicd, ux]
created: 2026-04-07
updated: 2026-04-07
summary: "All 9 Mermaid diagrams: logical architecture, PostgreSQL ERD, Neo4j graph model, ETL flow, deployment, CI/CD, request sequence, frontend component tree, user journey."
---

# System Diagrams — Cotagraph

All Mermaid diagrams in one place. Updated: 2026-04-07.

---

## 1. Logical Architecture (Component View)

```mermaid
graph TB
    subgraph "Client (Browser)"
        UI["React + Vite + TS\n─────────────\nCytoscape.js graph\nZustand state\nTanStack Query cache"]
    end

    subgraph "Edge / CDN"
        Vercel["Vercel Edge\n─────────────\nStatic assets\nCDN cache\nAuto HTTPS"]
    end

    subgraph "API Layer (Cloud Run)"
        API["FastAPI\n─────────────\n/api/v1/*\n/ws/* (Phase 2)\nOpenAPI docs at /docs"]
        Cache["Redis (Upstash)\n─────────────\nResponse cache TTL=5min\nKey: entity_id+depth+filters"]
    end

    subgraph "Data Layer"
        Neo4j["Neo4j AuraDB\n─────────────\nGraph traversal\nPath queries\nCypher + GDS plugin"]
        PG["PostgreSQL (Supabase)\n─────────────\nSource of truth\nFull raw data\nETL audit log"]
        ES["Elasticsearch (Bonsai)\n─────────────\nFull-text search\nPhase 2 only"]
    end

    subgraph "Ingestion Layer"
        GHA["GitHub Actions\n─────────────\ncron: weekly refresh\nManual trigger allowed"]
        ETL["ETL Worker (Python)\n─────────────\nDownload + normalize\nUPSERT to PG\nMERGE to Neo4j"]
    end

    subgraph "External Sources"
        Camara["Câmara API\ndadosabertos.camara.leg.br"]
        CGU["CGU Portal\nportaldatransparencia.gov.br"]
        IBGE["IBGE API\nservicodados.ibge.gov.br"]
    end

    UI -->|"HTTPS GET /api/v1/*"| Vercel
    Vercel -->|proxy| API
    API <-->|"GET/SET TTL 5min"| Cache
    API -->|Cypher read queries| Neo4j
    API -->|SQL read queries| PG
    API -.->|Phase 2| ES
    GHA -->|trigger| ETL
    ETL -->|UPSERT| PG
    ETL -->|"UNWIND MERGE"| Neo4j
    ETL -->|HTTP| Camara
    ETL -->|"HTTP / file download"| CGU
    ETL -->|HTTP| IBGE
```

---

## 2. PostgreSQL ERD (Source of Truth)

```mermaid
erDiagram
    deputies {
        serial id PK
        integer camara_id UK
        varchar name
        varchar party
        varchar state
        text photo_url
        timestamptz created_at
        timestamptz updated_at
    }
    beneficiaries {
        serial id PK
        varchar cnpj_cpf UK
        varchar name
        varchar legal_nature
        varchar uf
        varchar municipality
        timestamptz created_at
    }
    municipalities {
        serial id PK
        varchar ibge_code UK
        varchar name
        varchar uf
    }
    amendments {
        serial id PK
        varchar amendment_code UK
        integer deputy_id FK
        integer beneficiary_id FK
        varchar amendment_type
        decimal amount_paid_brl
        decimal amount_committed_brl
        integer year
        varchar policy_area
        varchar source_file
    }
    ceap_expenses {
        serial id PK
        integer deputy_id FK
        integer beneficiary_id FK
        varchar expense_category
        decimal net_value_brl
        date expense_date
        integer year
        integer month
        varchar document_number
        jsonb raw_data
    }
    sync_logs {
        serial id PK
        varchar pipeline_name
        varchar status
        integer records_upserted
        integer records_skipped
        integer records_failed
        timestamptz started_at
        timestamptz finished_at
        text error_message
    }

    deputies ||--o{ amendments : "sends"
    deputies ||--o{ ceap_expenses : "incurs"
    beneficiaries ||--o{ amendments : "receives"
    beneficiaries ||--o{ ceap_expenses : "receives"
    beneficiaries }o--|| municipalities : "located_in"
```

---

## 3. Neo4j Graph Model (Nodes and Edges)

```mermaid
graph LR
    D1["(:Deputy)\n─────\ncamara_id: 4497\nname: Arthur Lira\nparty: PP\nstate: AL"]
    D2["(:Deputy)\n─────\nname: Baleia Rossi\nparty: MDB\nstate: SP"]
    P1["(:Party)\n─────\nacronym: PP"]
    S1["(:State)\n─────\nuf: AL"]
    B1["(:Beneficiary)\n─────\ncnpj: 09.167.643/...\nname: Pref. Maceió\nlegal_nature: Ente Público Municipal"]
    B2["(:Beneficiary)\n─────\nname: Pref. São Paulo"]
    M1["(:Municipality)\n─────\nibge_code: 2704302\nname: Maceió\nuf: AL"]

    D1 -->|":MEMBER_OF"| P1
    D1 -->|":REPRESENTS"| S1
    D1 -->|":SENT_AMENDMENT\namount_brl: 500000\nyear: 2024"| B1
    D1 -->|":SENT_AMENDMENT\namount_brl: 200000\nyear: 2024"| B2
    D2 -->|":SENT_AMENDMENT\namount_brl: 300000\nyear: 2024"| B1
    D1 -->|":SPENT_ON\ncategory: ALIMENTAÇÃO\namount_brl: 5000"| B2
    B1 -->|":LOCATED_IN"| M1
```

---

## 4. ETL Data Flow (Ingestion Pipeline)

```mermaid
flowchart TD
    subgraph Sources
        F1["emendas_por_favorecido_partidos.csv\n(seed — already local, 6.7MB)"]
        A1["Câmara API /deputados\n(master deputy list + IDs)"]
        A2["CEAP zip files\ncamara.leg.br/cotas/Ano-{n}.csv.zip"]
        A3["IBGE API /localidades/municipios"]
    end

    subgraph Normalize
        N1["Normalize deputies\n• strip accents / uppercase\n• map name→camara_id\n  exact → rapidfuzz ≥85 → log unmatched"]
        N2["Normalize beneficiaries\n• strip CNPJ/CPF formatting\n• classify legal_nature\n• resolve municipality IBGE code"]
        N3["Validate amounts\n• filter Valor Pago > 0\n• already in BRL"]
    end

    subgraph LoadPG ["Load to PostgreSQL"]
        PG1["UPSERT deputies\nON CONFLICT camara_id DO UPDATE"]
        PG2["UPSERT beneficiaries\nON CONFLICT cnpj_cpf DO UPDATE"]
        PG3["INSERT amendments\nON CONFLICT amendment_code DO NOTHING"]
        PG4["INSERT sync_log\n(status, counts, timestamp)"]
    end

    subgraph LoadNeo ["Load to Neo4j"]
        NEO1["UNWIND deputies → MERGE (:Deputy)"]
        NEO2["UNWIND beneficiaries → MERGE (:Beneficiary)"]
        NEO3["UNWIND amendments → MERGE [:SENT_AMENDMENT]"]
        NEO4["MERGE (:Party), (:State), [:MEMBER_OF], [:REPRESENTS]"]
    end

    F1 --> N1 & N2 & N3
    A1 --> N1
    A2 --> N1 & N3
    A3 --> N2
    N1 --> PG1 --> NEO1
    N2 --> PG2 --> NEO2
    N3 --> PG3 --> NEO3
    PG1 & PG2 & PG3 --> PG4
    NEO1 & NEO2 & NEO3 --> NEO4
```

---

## 5. Deployment — Physical View (Production)

```mermaid
graph TB
    subgraph Internet
        User["User Browser"]
    end
    subgraph "Vercel Edge Network (free)"
        VCL["vercel.app\nStatic React bundle\nEdge CDN cache"]
    end
    subgraph "Google Cloud (free tier)"
        GCR["Cloud Run\nFastAPI container\nScales to zero"]
        GHCR["GitHub Container Registry\nDocker images"]
    end
    subgraph "Managed DBs (free tiers)"
        SUP["Supabase\nPostgreSQL 15 · 500MB · sa-east-1"]
        NEO["Neo4j AuraDB Free\n50K nodes · 175K rels · us-east-1"]
        UPS["Upstash Redis\n10K req/day · serverless"]
    end
    subgraph "GitHub (free)"
        GHA["GitHub Actions\nCI · CD · ETL cron"]
    end

    User -->|HTTPS| VCL
    VCL -->|"proxy /api/*"| GCR
    GCR <--> UPS & NEO & SUP
    GHA -->|docker push| GHCR
    GHA -->|gcloud run deploy| GCR
    GHA -->|ETL job| SUP & NEO
    GHCR -->|image pull| GCR
```

---

## 6. CI/CD Pipeline

```mermaid
flowchart LR
    Dev["git push\nfeat/branch"]

    subgraph CI ["GitHub Actions — CI"]
        Lint["ruff · mypy · tsc"]
        Test["pytest + vitest\ntestcontainers"]
        Build["docker build"]
    end

    PR["Pull Request\nbranch protection"]

    subgraph CD ["GitHub Actions — CD (main)"]
        Push["docker push → GHCR"]
        DeployBE["gcloud run deploy\n→ Cloud Run"]
        DeployFE["Vercel auto-deploy"]
    end

    Dev --> Lint --> Test --> Build --> PR
    PR -->|merge| Push
    Push --> DeployBE & DeployFE
```

---

## 7. Request Flow — Graph Query (Sequence)

```mermaid
sequenceDiagram
    actor User
    participant React
    participant TQ as TanStack Query
    participant API as FastAPI
    participant Redis
    participant Neo4j

    User->>React: clicks deputy node
    React->>TQ: useQuery(['graph', id, depth])
    alt browser cache hit
        TQ-->>React: instant cached data
    else cache miss
        TQ->>API: GET /api/v1/graph/deputy_4497?depth=2
        API->>Redis: GET graph:deputy_4497:depth2
        alt Redis hit
            Redis-->>API: cached JSON
        else Redis miss
            API->>Neo4j: MATCH (d)-[r*..2]-(n) RETURN d,r,n LIMIT 100
            Neo4j-->>API: nodes + relationships
            API->>API: serialize → CytoscapeJSON
            API->>Redis: SET key EX 300
        end
        API-->>TQ: 200 { nodes, edges }
        TQ-->>React: graph data
    end
    React->>React: Cytoscape.js renders graph
```

---

## 8. Frontend Component Tree

```mermaid
graph TD
    App["App.tsx — Router + Layout"]
    App --> Home["HomePage  /"]
    App --> Graph["GraphPage  /graph"]
    App --> Deputy["DeputyPage  /deputy/:id"]
    App --> Benef["BeneficiaryPage  /beneficiary/:cnpj"]

    Graph --> SB["SearchBar\ndebounced · autocomplete"]
    Graph --> Stats["StatsBanner\ntotal BRL · count"]
    Graph --> Canvas["GraphCanvas\nCytoscape.js"]
    Graph --> Side["Sidebar"]

    Canvas --> Tooltip["NodeTooltip\nname · amount · party"]
    Canvas --> Controls["GraphControls\nzoom · fit · layout"]
    Canvas --> Legend["Legend\ncolor key"]

    Side --> Card["DeputyCard\nphoto · party · total"]
    Side --> Filter["FilterPanel\nyear · party · edge type"]
    Side --> Top["TopSpendersList"]

    Deputy --> ATable["AmendmentTable\npaginated"]
    Deputy --> ETable["ExpenseTable (Phase 2)"]
```

---

## 9. User Journey

```mermaid
journey
    title Cotagraph User Journey
    section Discovery
      Land on homepage: 5: User
      See search bar + top spenders: 5: User
      Read total R$ summary: 4: User
    section Search
      Type deputy name: 5: User
      See autocomplete: 4: User
      Select deputy: 5: User
    section Exploration
      Deputy card appears in sidebar: 5: User
      Graph renders with beneficiaries: 4: User
      Hover node for tooltip: 5: User
      Click beneficiary node: 5: User
    section Deep Dive
      See other deputies who paid same beneficiary: 4: User
      Apply year filter: 3: User
      Notice concentrated flows: 5: User
    section Share
      Copy shareable URL: 4: User
      Share with journalist: 5: User
```
