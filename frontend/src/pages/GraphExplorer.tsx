import { useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api } from "@/api/client";
import { GraphCanvas, GraphCanvasHandle } from "@/components/GraphCanvas";
import { InfoDrawer } from "@/components/InfoDrawer";
import type { GraphResponse, GraphNode, GraphEdge, SelectedNodeInfo } from "@/api/types";

export function GraphExplorer() {
  const { entityId } = useParams<{ entityId: string }>();
  const canvasRef = useRef<GraphCanvasHandle>(null);

  const [depth, setDepth] = useState(2);
  const [maxNodes, setMaxNodes] = useState(100);
  const [year, setYear] = useState<number | undefined>(undefined);
  const [selectedNode, setSelectedNode] = useState<SelectedNodeInfo | null>(null);

  const { data, isLoading, error } = useQuery<GraphResponse>({
    queryKey: ["graph", entityId, depth, maxNodes, year],
    queryFn: () =>
      api.graph.subgraph(entityId!, {
        depth,
        max_nodes: maxNodes,
        year,
      }) as Promise<GraphResponse>,
    enabled: !!entityId,
  });

  const handleNodeSelect = useCallback(
    (
      nodeData: GraphNode["data"],
      allEdges: GraphEdge["data"][],
      allNodes: GraphNode[]
    ) => {
      setSelectedNode((prev) =>
        prev?.node.id === nodeData.id
          ? null
          : { node: nodeData, allEdges, allNodes }
      );
    },
    []
  );

  const entityType = entityId?.split("_")[0] ?? "";
  const entityKey = entityId?.replace(/^[^_]+_/, "") ?? "";

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "1.5rem 1rem" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: "1rem",
        }}
      >
        <Link
          to="/"
          style={{ color: "#4f46e5", textDecoration: "none", fontSize: 14 }}
        >
          ← Início
        </Link>
        <h1 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
          Grafo —{" "}
          <span style={{ color: "#64748b", fontWeight: 400 }}>
            {entityType}
          </span>{" "}
          <span style={{ fontFamily: "monospace", color: "#4f46e5" }}>
            {entityKey}
          </span>
        </h1>
      </div>

      {/* Controls row */}
      <div
        style={{
          display: "flex",
          gap: 20,
          marginBottom: "0.75rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <label style={labelStyle}>
          Profundidade: <strong>{depth}</strong>
          <input
            type="range"
            min={1}
            max={3}
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
            style={{ marginLeft: 8, width: 70 }}
          />
        </label>

        <label style={labelStyle}>
          Máx. nós: <strong>{maxNodes}</strong>
          <input
            type="range"
            min={20}
            max={300}
            step={10}
            value={maxNodes}
            onChange={(e) => setMaxNodes(Number(e.target.value))}
            style={{ marginLeft: 8, width: 90 }}
          />
        </label>

        <label style={labelStyle}>
          Ano:
          <select
            value={year ?? ""}
            onChange={(e) =>
              setYear(e.target.value ? Number(e.target.value) : undefined)
            }
            style={{ ...selectStyle, marginLeft: 8 }}
          >
            <option value="">Todos</option>
            {[2019, 2020, 2021, 2022, 2023, 2024].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>

        {/* Zoom controls */}
        <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
          <button
            onClick={() => canvasRef.current?.zoomIn()}
            style={iconBtn}
            title="Aproximar"
          >
            +
          </button>
          <button
            onClick={() => canvasRef.current?.zoomOut()}
            style={iconBtn}
            title="Afastar"
          >
            −
          </button>
          <button
            onClick={() => canvasRef.current?.fit()}
            style={{ ...iconBtn, fontSize: 11, padding: "0 8px" }}
            title="Ajustar ao ecrã"
          >
            Fit
          </button>
        </div>
      </div>

      {/* Status bar */}
      {data && (
        <div
          style={{
            fontSize: 12,
            color: "#94a3b8",
            marginBottom: 8,
            display: "flex",
            gap: 16,
          }}
        >
          <span>{data.nodes.length} nós</span>
          <span>{data.edges.length} arestas</span>
          {data.nodes.length >= maxNodes && (
            <span style={{ color: "#f59e0b" }}>
              limite atingido — aumente Máx. nós para ver mais
            </span>
          )}
          <span>
            Passe o mouse sobre uma aresta para ver o valor · Clique em um nó
            para ver detalhes
          </span>
        </div>
      )}

      {isLoading && (
        <div
          style={{
            height: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#94a3b8",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
          }}
        >
          Carregando grafo...
        </div>
      )}

      {error && (
        <div
          style={{
            height: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ef4444",
          }}
        >
          Entidade não encontrada ou erro ao carregar grafo.
        </div>
      )}

      {/* Graph canvas + info drawer in flex row */}
      {data && (
        <div
          style={{
            display: "flex",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <GraphCanvas
            ref={canvasRef}
            nodes={data.nodes}
            edges={data.edges}
            centerId={data.center_id}
            onNodeSelect={handleNodeSelect}
          />
          {selectedNode && (
            <InfoDrawer
              node={selectedNode.node}
              allEdges={selectedNode.allEdges}
              allNodes={selectedNode.allNodes}
              onClose={() => setSelectedNode(null)}
            />
          )}
        </div>
      )}

      {data && <Legend />}
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
    <div style={{ display: "flex", gap: 20, marginTop: 10, flexWrap: "wrap" }}>
      {items.map(({ color, label }) => (
        <div
          key={label}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "#64748b",
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: color,
              flexShrink: 0,
            }}
          />
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
  gap: 0,
};
const selectStyle: React.CSSProperties = {
  padding: "0.3rem 0.6rem",
  border: "1px solid #e2e8f0",
  borderRadius: 6,
  background: "#fff",
  fontSize: 14,
};
const iconBtn: React.CSSProperties = {
  width: 32,
  height: 32,
  border: "1px solid #e2e8f0",
  borderRadius: 6,
  background: "#fff",
  cursor: "pointer",
  fontSize: 16,
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
