# Graph Explorer UX — Design Spec
**Date:** 2026-04-10
**Status:** Approved

## Context

The Graph Explorer (`/graph/:entityId`) renders an interactive Cytoscape.js subgraph of parliamentary amendment flows. The current implementation hides all labels by default (show on hover only) and has no mechanism to display edge amounts or node details. Users reported being disoriented when exploring dense graphs with 100+ nodes.

This spec defines three improvements:
1. Smart label visibility (always-on for deputies + zoom-based for others)
2. A right-side info drawer that opens on node click with rich entity data
3. Edge visual encoding — thickness = amount, hover tooltip = value + year

---

## 1. Node Label Visibility

### Rules
| Node type | Label visibility |
|---|---|
| Deputy | Always visible (persistent) |
| Beneficiary | Appears at zoom ≥ 1.5× |
| Municipality | Appears at zoom ≥ 1.5× |
| Party | Appears at zoom ≥ 2.0× |
| State | Appears at zoom ≥ 2.0× |
| Center/focus node | Always visible, regardless of type |

### Implementation
- Use Cytoscape's `zoom` event to update a CSS class on the `cy` container or apply dynamic style updates
- Smooth opacity transition: `transition: opacity 0.2s`
- At zoom < 0.6: all labels hidden (performance — canvas too small to read anyway)
- Deputy label: font-size 10px, text-outline white 2px, text-valign bottom
- Center node: font-size 13px, always visible, white ring border (3px)

### Cytoscape style selectors needed
```
node[type="deputy"]           → text-opacity: 1 always
node[type="beneficiary"].zoom-high  → text-opacity: 1
node[type="municipality"].zoom-high → text-opacity: 1
node[type="party"].zoom-veryhigh    → text-opacity: 1
node[type="state"].zoom-veryhigh    → text-opacity: 1
```
Classes `zoom-high` and `zoom-veryhigh` are toggled on `cy.on('zoom')`.

---

## 2. Info Drawer (Right Panel)

### Behavior
- **Trigger:** Single tap/click on any node
- **Position:** Opens as a panel on the right side of the graph canvas container (not the browser sidebar — inside the graph div)
- **Width:** 280px fixed; graph canvas flexes to fill remaining space
- **Open/close:** Clicking a node opens (or updates) the drawer. Clicking the same node again, pressing Escape, or clicking ✕ closes it.
- **Update without close:** Clicking a different node while drawer is open replaces content with new node's data (no flicker — swap in place)

### Drawer content by node type

**Deputy node:**
```
[badge: DEPUTADO]
Name (full, bold, large)
Party · State
────────────────
Total emendas:   R$ X,XXX,XXX
Nº de emendas:   XXX
────────────────
Top beneficiários (up to 5, by amount):
  • Nome Beneficiário ......... R$ X,XM
  • ...
────────────────
[button: Ver perfil completo →]  (→ /deputies/{camara_id})
```

**Beneficiary node:**
```
[badge: BENEFICIÁRIO]
Name (full, bold, large)
CNPJ: XX.XXX.XXX/XXXX-XX
Município · UF
────────────────
Total recebido:  R$ X,XXX,XXX
────────────────
Por ano:
  2024  ████████ R$ X,XM
  2023  ██████   R$ X,XM
  2022  ████     R$ X,XM
  (show years present in edges, sorted desc)
────────────────
[button: Copiar CNPJ]  (copies CNPJ to clipboard — no beneficiary detail page exists yet)
```

**Party / State / Municipality node:**
```
[badge: PARTIDO | ESTADO | MUNICÍPIO]
Name (full, bold)
────────────────
Deputados conectados: XX
Total emendas:   R$ X,XXX,XXX
(aggregated from SENT_AMENDMENT edges in visible subgraph)
```

### Data sources
- Node properties come directly from the Cytoscape node's `data()` object (already loaded from the APOC subgraph response)
- Year breakdown: aggregate connected `SENT_AMENDMENT` edges by `year` and `amount_brl` from `cy.edges('[type="sent_amendment"]')` connected to the selected node — **no additional API call needed**
- "Top beneficiaries" for deputies: same — filter outgoing SENT_AMENDMENT edges, group by target, sum amounts, sort desc, take top 5

### React implementation
- `InfoDrawer` is a sibling component to `GraphCanvas`, rendered inside the same flex container
- `GraphCanvas` exposes `onNodeSelect(nodeData, connectedEdges)` callback
- `GraphExplorer` holds `selectedNode` state, passes it to `InfoDrawer`
- `InfoDrawer` receives `{ node: GraphNode | null, edges: GraphEdge[] }` — renders null when node is null (drawer closed)
- No additional API calls — all data aggregated from props already in memory

---

## 3. Edge Visual Encoding

### SENT_AMENDMENT edges
- **Thickness:** proportional to `amount_brl` using log scale
  - Formula: `width = 1 + 4 * (log(amount) - log(min)) / (log(max) - log(min))`
  - Range: 1px (min amount) → 5px (max amount)
  - Computed once after graph loads, stored as `data(weight)` on each edge
  - Cytoscape style: `width: data(weight)`
- **Color:** `#818cf8` (indigo-400) at opacity 0.7
- **Hover tooltip:** native HTML tooltip via `cy.on('mouseover', 'edge')` → position a small div at mouse coords showing `"R$ X,XM · Ano: XXXX"`

### Structural edges (MEMBER_OF, REPRESENTS, LOCATED_IN, PART_OF)
- Width: 1px
- Color: `#cbd5e1` (gray)
- No tooltip
- Opacity: 0.4

### Edge tooltip implementation
- Single `<div id="edge-tooltip">` element positioned absolute inside graph container
- On `cy.on('mouseover', 'edge[type="sent_amendment"]')`: set content + show at `evt.renderedPosition`
- On `cy.on('mouseout', 'edge')`: hide tooltip
- Format: `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' })`

---

## 4. v0 Design Integration

The `desing-proto/vercel.v1/` folder contains shadcn/ui + Tailwind components generated by v0.dev:
- `components/dashboard.tsx` — dashboard with stat cards, icons, sidebar layout
- `components/sidebar-layout.tsx` — left sidebar nav component
- `app/graph/page.tsx` — graph page shell with controls bar

**Migration plan (separate from this spec):** Integrate v0 components into the existing Vite/React app by:
1. Installing Tailwind CSS + shadcn/ui dependencies
2. Copying sidebar-layout and dashboard components (removing Next.js `Link` → react-router-dom `Link`)
3. Replacing current inline-styled pages with v0 components wired to existing TanStack Query hooks

This spec covers **only** the graph interaction layer (labels, drawer, edge encoding). The v0 visual redesign is a subsequent task.

---

## 5. Files to Create / Modify

| File | Change |
|---|---|
| `frontend/src/components/GraphCanvas.tsx` | Add zoom-based label logic, edge weight computation, edge tooltip div, `onNodeSelect` callback |
| `frontend/src/components/InfoDrawer.tsx` | New component — right panel with node detail |
| `frontend/src/pages/GraphExplorer.tsx` | Add `selectedNode` state, wire `InfoDrawer`, adjust flex layout |
| `frontend/src/api/types.ts` | Add `SelectedNodeInfo` type |

---

## 6. Verification

```bash
# Start stack
cd e:/Learning/TCC-MBA/cotagraph/frontend && npm run dev

# Test label visibility
# 1. Open /graph/deputy_4497
# 2. Verify deputy node names are always visible
# 3. Zoom in past 1.5× — beneficiary labels should fade in
# 4. Zoom out — labels fade out

# Test info drawer
# 5. Click a beneficiary node → drawer opens on right, graph narrows
# 6. Verify drawer shows: name, CNPJ, total BRL, year breakdown
# 7. Click a different node → drawer updates without closing
# 8. Press Escape → drawer closes, graph returns to full width
# 9. Click deputy node → verify top 5 beneficiaries list with amounts

# Test edge encoding
# 10. SENT_AMENDMENT edges should vary in thickness (thin=small amount, thick=large)
# 11. Hover over a thick edge → tooltip shows "R$ X,XM · Ano: 20XX"
# 12. Hover over gray structural edge → no tooltip

# Test zoom + drawer combination
# 13. Open drawer + zoom in → labels should still appear at threshold
```
