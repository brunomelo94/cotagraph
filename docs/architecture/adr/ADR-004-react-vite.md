---
id: adr-004-react-vite
title: "ADR-004: React + Vite + TypeScript for Frontend"
type: adr
status: decided
tags: [react, vite, typescript, frontend, phase1]
related: [adr-005-cytoscapejs, architecture/frontend_components]
created: 2026-04-07
updated: 2026-04-07
summary: "React + Vite chosen over Angular. Simpler mental model lets focus land on graph visualization and state management rather than framework ceremony."
---

# ADR-004: React + Vite + TypeScript for Frontend

## Status

Decided — 2026-04-07

## Context

The frontend must render an interactive graph, manage complex filter state, and fetch data efficiently. Two frameworks were seriously considered: React and Angular.

## Decision

Use React 18 with Vite 5 as the build tool and TypeScript throughout.

## Rationale

- **Lower initial friction:** React's component model is simpler to reason about when also learning graph visualization and state management patterns. Angular's DI system, module declarations, and RxJS add ceremony that isn't justified for a single-developer project.
- **Vite:** Near-instant HMR (hot module replacement) and fast cold starts improve developer experience significantly over Create React App or webpack-based setups.
- **Ecosystem:** Cytoscape.js, TanStack Query, Zustand, and react-i18next all have first-class React support.
- **Transferable patterns:** The component structure (`GraphCanvas`, `Sidebar`, `FilterPanel`) maps 1:1 to Angular components if migration is ever wanted. The decision is reversible.
- **TypeScript:** Required regardless of framework choice. Catches API contract mismatches at compile time.

## Alternatives Considered

| Option | Rejected because |
| --- | --- |
| Angular | Steeper initial setup; DI + module system adds cognitive load; better for larger teams |
| Vue 3 | Smaller ecosystem for graph visualization libraries; less community support for Cytoscape integration |
| SvelteKit | Excellent DX but smaller ecosystem; less Cytoscape.js community experience |

## Consequences

- TypeScript is mandatory — no `any` in production code paths
- State management: Zustand (not Redux — too much boilerplate for this scope)
- Data fetching: TanStack Query (not SWR — better devtools and more flexible cache config)
- i18n: react-i18next for Phase 3 Portuguese localization
