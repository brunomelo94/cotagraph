---
id: ctx-project-overview
title: "Project Overview — Cotagraph"
type: context
status: current
tags: [overview, vision, goals, stakeholders]
created: 2026-04-07
updated: 2026-04-07
summary: "What Cotagraph is, why it exists, and who it serves. The foundational context document."
---

# Project Overview — Cotagraph

## What

Cotagraph is a full-stack web application that tracks and visualizes public spending by Brazilian federal deputies. It models financial flows as a graph: deputies are sender nodes, municipalities, state governments, and private contractors are receiver nodes, and money transfers (amendments or CEAP expenses) are weighted directed edges.

## Why

Brazil's federal budget is constitutionally allocated in part by individual deputies through two mechanisms:

- **Emendas Parlamentares** (Budget Amendments): deputies earmark specific amounts to municipalities or entities. Since Constitutional Amendment 105/2019, "Transferências Especiais" (PIX-style transfers) bypass the normal procurement process and go directly to city governments — R$ 4+ billion in 2024 alone.
- **CEAP** (Cota para Exercício da Atividade Parlamentar): each deputy receives a monthly allowance (~R$ 45K) for parliamentary activity expenses — office rent, travel, food, fuel, communications.

Both datasets are public but dispersed, hard to correlate, and not visualized as the network they actually are. Cotagraph makes the money network legible for citizens, journalists, and researchers.

## Who

| User type | Goal |
| --- | --- |
| Journalist | Find anomalies: deputy concentrating amendments to one city, CEAP expenses at unusual suppliers |
| Researcher | Analyze patterns: party-level spending, geographic distribution, electoral correlation |
| Citizen | Understand what their local deputy is doing with public money |
| Developer / Agent | Build, maintain, and extend the platform |

## Relationship to MBA Thesis

The `e:/Learning/TCC-MBA/` project is Bruno's MBA thesis (USP/Esalq) that statistically proved a positive correlation between Emendas PIX volume and mayor re-election probability in 2024 Brazilian municipal elections. That research produced cleaned CSV data that seeds Cotagraph's initial graph. The thesis is a separate project; Cotagraph is the product built on top of the same data ecosystem.

## Owner

Bruno Caetano Oliveira De Melo — GitHub: `brunomelo94`  
Personal/portfolio project. Free-tier infrastructure constraint is hard.
