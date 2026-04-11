import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "@/api/client";
import { GraphCanvas } from "@/components/GraphCanvas";
import type { GraphResponse } from "@/api/types";

export function GraphExplorer() {
  const { entityId } = useParams<{ entityId: string }>();
  const navigate = useNavigate();

  const [depth, setDepth] = useState(2);
  const [maxNodes, setMaxNodes] = useState(100);
  const [year, setYear] = useState<number | undefined>(undefined);

  const { data, isLoading, error } = useQuery<GraphResponse>({
    queryKey: ["graph", entityId, depth, maxNodes, year],
    queryFn: () =>
      api.graph.subgraph(entityId!, { depth, max_nodes: maxNodes, year }) as Promise<GraphResponse>,
    enabled: !!entityId,
  });

  const handleNodeTap = useCallback(
    (nodeId: string) => {
      navigate(`/graph/${nodeId}`);
    },
    [navigate]
  );

  const entityLabel = entityId
    ? entityId.replace(/^(deputy|beneficiary|party|state|municipality)_/, "").toUpperCase()
    : "";

  const entityType = entityId?.split("_")[0] ?? "";

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "1.25rem" }}>
        <Link to="/" style={{ color: "#4f46e5", textDecoration: "none", fontSize: 14 }}>
          ← Início
        </Link>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>
          Grafo — <span style={{ color: "#4f46e5" }}>{entityType}</span>{" "}
          <span style={{ fontFamily: "monospace" }}>{entityLabel}</span>
        </h1>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: "1rem", flexWrap: "wrap" }}>
        <label style={labelStyle}>
          Profundidade: {depth}
          <input
            type="range"
            min={1}
            max={3}
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
            style={{ marginLeft: 8, width: 80 }}
          />
        </label>

        <label style={labelStyle}>
          Máx. nós: {maxNodes}
          <input
            type="range"
            min={10}
            max={300}
            step={10}
            value={maxNodes}
            onChange={(e) => setMaxNodes(Number(e.target.value))}
            style={{ marginLeft: 8, width: 100 }}
          />
        </label>

        <label style={labelStyle}>
          Ano:
          <select
            value={year ?? ""}
            onChange={(e) => setYear(e.target.value ? Number(e.target.value) : undefined)}
            style={{ ...selectStyle, marginLeft: 8 }}
          >
            <option value="">Todos</option>
            {[2019, 2020, 2021, 2022, 2023, 2024].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
      </div>

      {isLoading && <p style={{ color: "#64748b" }}>Carregando grafo...</p>}
      {error && (
        <p style={{ color: "#ef4444" }}>
          Entidade não encontrada ou erro ao carregar grafo.
        </p>
      )}

      {data && (
        <>
          <div style={{ color: "#64748b", fontSize: 13, marginBottom: 8 }}>
            {data.nodes.length} nós · {data.edges.length} arestas
            {data.nodes.length >= maxNodes && (
              <span style={{ color: "#f59e0b", marginLeft: 8 }}>
                (limite atingido — aumente "Máx. nós" para ver mais)
              </span>
            )}
          </div>
          <GraphCanvas nodes={data.nodes} edges={data.edges} onNodeTap={handleNodeTap} />
          <Legend />
        </>
      )}
    </div>
  );
}

function Legend() {
  const items = [
    { color: "#4f46e5", label: "Deputado" },
    { color: "#10b981", label: "Beneficiário" },
    { color: "#f59e0b", label: "Partido" },
    { color: "#ef4444", label: "Estado" },
    { color: "#8b5cf6", label: "Município" },
  ];
  return (
    <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
      {items.map(({ color, label }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: color }} />
          {label}
        </div>
      ))}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  fontSize: 14,
  color: "#374151",
};

const selectStyle: React.CSSProperties = {
  padding: "0.35rem 0.6rem",
  border: "1px solid #e2e8f0",
  borderRadius: 6,
  background: "#fff",
  fontSize: 14,
};
