---
id: adr-005-cytoscapejs
title: "ADR-005: Cytoscape.js for Graph Visualization"
type: adr
status: decided
tags: [cytoscape, graph-visualization, frontend, phase1]
related: [adr-004-react-vite, architecture/frontend_components]
created: 2026-04-07
updated: 2026-04-07
summary: "Cytoscape.js chosen over D3-force and vis-network. Purpose-built for network graphs, cose-bilkent layout handles political hub-and-spoke patterns, MIT licensed."
---

# ADR-005: Cytoscape.js for Graph Visualization

## Status

Decided — 2026-04-07

## Context

The frontend must render an interactive network graph with hundreds to thousands of nodes and edges. The graph must support click-to-expand, hover tooltips, edge labels, and multiple layout algorithms. Performance and layout quality for hub-and-spoke political networks (many deputies pointing to the same beneficiaries) is critical.

## Decision

Use Cytoscape.js with the `cytoscape-cose-bilkent` layout plugin.

## Rationale

- **Purpose-built for network graphs:** Cytoscape.js was designed for biological and social network visualization — not generic charts. Its mental model matches our use case exactly.
- **`cose-bilkent` layout:** Physics-based layout that handles hub-and-spoke graphs (one high-spending deputy with many connected beneficiaries) better than D3-force's default spring model. Produces readable, non-tangled graphs at 100–500 nodes.
- **Performance:** Handles 10,000+ nodes with canvas rendering. Our MVP won't approach this, but the headroom matters.
- **Built-in interaction API:** Click handlers, hover events, compound nodes, edge selection, and zoom/pan are first-class — not bolted on.
- **MIT licensed:** No licensing concerns for public deployment.

## Alternatives Considered

| Option | Rejected because |
| --- | --- |
| D3-force | Force simulation requires significant tuning for political networks; no built-in click/hover interaction patterns; SVG rendering is slower at scale |
| vis-network | Good for simple graphs; layout algorithms less sophisticated; community smaller |
| Sigma.js | WebGL rendering (fast) but less flexible for complex node/edge styling; smaller ecosystem |
| React Flow | Designed for flowcharts/DAGs, not arbitrary network graphs |

## Consequences

- Must install `cytoscape-cose-bilkent` as a separate package and register the layout
- Cytoscape instance is managed as a React ref (not state) to avoid re-render loops
- `GraphCanvas` component is intentionally a thin wrapper — Cytoscape has its own lifecycle
- Touch/mobile interaction with Cytoscape is poor — this is an accepted trade-off (desktop-first)
