---
id: arch-frontend-components
title: "Frontend Components — React + Cytoscape.js"
type: architecture
status: decided
tags: [frontend, react, vite, typescript, cytoscape, zustand, components, phase1]
related: [architecture/adr/ADR-004-react-vite, architecture/adr/ADR-005-cytoscapejs, diagrams/all_diagrams]
created: 2026-04-07
updated: 2026-04-07
summary: "React component tree, routing, Zustand store shape, TanStack Query usage, and Cytoscape.js integration pattern."
---

# Frontend Components — React + Vite + TypeScript

## Routing (react-router-dom v6)

| Route | Component | Description |
| --- | --- | --- |
| `/` | `HomePage` | Search bar + top spenders list + stats banner |
| `/graph` | `GraphPage` | Full graph canvas with sidebar |
| `/deputy/:camara_id` | `DeputyPage` | Deputy profile + amendment table |
| `/beneficiary/:cnpj` | `BeneficiaryPage` | Beneficiary profile + who paid them |

Graph state is encoded in URL search params so views are shareable:  
`/graph?focus=deputy_4497&depth=2&year=2024&edge_type=amendment`

---

## Component Tree

```
App (Router + Layout shell)
├── HomePage  /
│   ├── SearchBar           debounced input → autocomplete via API
│   ├── StatsBanner         total BRL, deputy count (from /stats/summary)
│   └── TopSpendersList     ranked table from /graph/top-spenders
│
├── GraphPage  /graph
│   ├── SearchBar           (shared component)
│   ├── GraphCanvas         Cytoscape.js mount point
│   │   ├── NodeTooltip     hover card: name, amount, party, legal_nature
│   │   ├── GraphControls   zoom in/out, fit to screen, layout picker
│   │   └── Legend          color key for node types and edge types
│   └── Sidebar
│       ├── DeputyCard      photo, name, party, state, total_brl
│       ├── FilterPanel     year dropdown, party multi-select, edge type toggle
│       └── TopSpendersList (reused)
│
├── DeputyPage  /deputy/:camara_id
│   ├── DeputyCard          (shared component, larger variant)
│   ├── AmendmentTable      paginated, sortable by amount/year/policy_area
│   └── ExpenseTable        CEAP — Phase 2
│
└── BeneficiaryPage  /beneficiary/:cnpj
    ├── BeneficiaryCard     name, legal_nature, uf, total_received
    └── SendersList         deputies who sent amendments to this beneficiary
```

---

## Zustand Store Shape

```typescript
// src/store/graphStore.ts

interface GraphStore {
  // Selection
  selectedNodeId: string | null;
  setSelectedNode: (id: string | null) => void;

  // Filters (synced to URL params)
  filters: {
    year: number | null;        // null = all years
    party: string[];            // empty = all parties
    edgeType: 'amendment' | 'ceap' | 'all';
    depth: 1 | 2 | 3;
  };
  setFilters: (partial: Partial<GraphStore['filters']>) => void;

  // Expanded nodes (which entity IDs have been loaded into graph)
  expandedNodes: Set<string>;
  addExpandedNode: (id: string) => void;
  resetGraph: () => void;
}
```

---

## TanStack Query Usage Pattern

```typescript
// src/hooks/useGraph.ts

export function useGraph(entityId: string, filters: GraphFilters) {
  return useQuery({
    queryKey: ['graph', entityId, filters],
    queryFn: () => api.fetchGraph(entityId, filters),
    staleTime: 5 * 60 * 1000,   // 5 minutes (matches Redis TTL)
    enabled: !!entityId,
  });
}

// src/hooks/useDeputies.ts
export function useDeputies(params: DeputyListParams) {
  return useQuery({
    queryKey: ['deputies', params],
    queryFn: () => api.fetchDeputies(params),
    staleTime: 10 * 60 * 1000,  // deputies list changes rarely
  });
}
```

---

## Cytoscape.js Integration Pattern

```typescript
// src/components/Graph/GraphCanvas.tsx

interface GraphCanvasProps {
  elements: CytoscapeElements;   // { nodes: CyNode[], edges: CyEdge[] }
  onNodeClick: (nodeId: string, nodeType: string) => void;
  layout?: 'cose-bilkent' | 'breadthfirst' | 'concentric';
}
```

**Node styling rules:**
- Deputy nodes: blue, size proportional to `log(total_brl)`
- Beneficiary nodes: green (public entity) or orange (private entity)
- Party nodes: gray (aggregation view only)
- State nodes: purple

**Edge styling rules:**
- `:SENT_AMENDMENT` edges: solid, width proportional to `log(amount_brl)`
- `:SPENT_ON` edges: dashed

**Layout:** `cose-bilkent` (default — best for political hub-and-spoke graphs)

---

## TypeScript Types

```typescript
// src/types/graph.ts

interface CyNode {
  data: {
    id: string;              // e.g. "deputy_4497"
    label: string;
    type: 'deputy' | 'beneficiary' | 'party' | 'state' | 'municipality';
    party?: string;
    state?: string;
    legal_nature?: string;
    total_brl?: number;
  };
}

interface CyEdge {
  data: {
    id: string;
    source: string;
    target: string;
    type: 'amendment' | 'ceap';
    amount_brl: number;
    year?: number;
    count?: number;          // number of transactions on this edge
  };
}
```

---

## Key Libraries

| Library | Version | Purpose |
| --- | --- | --- |
| `react` | 19.2 | UI framework (ref-as-prop, `use()` hook — no `forwardRef`) |
| `vite` | 8 | Build tool + Rolldown bundler (Rust). Node 20.19+ required |
| `typescript` | 5 | Type safety |
| `cytoscape` | 3 | Graph rendering |
| `cytoscape-cose-bilkent` | — | Layout algorithm plugin |
| `@tanstack/react-query` | 5 | Server state + caching |
| `zustand` | 4 | Client UI state |
| `react-router-dom` | 6 | Client-side routing |
| `axios` | — | HTTP client |
| `react-i18next` | — | i18n (Phase 3, for Portuguese UI) |
