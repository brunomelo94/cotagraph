import { useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Plus, Minus, Maximize2 } from "lucide-react";
import { api } from "@/api/client";
import { GraphCanvas, GraphCanvasHandle } from "@/components/GraphCanvas";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { GraphResponse } from "@/api/types";

export function GraphExplorer() {
  const { entityId } = useParams<{ entityId: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<GraphCanvasHandle>(null);

  const [depth, setDepth] = useState(2);
  const [maxNodes, setMaxNodes] = useState(100);
  const [year, setYear] = useState<number | undefined>(undefined);

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

  const handleNodeNavigate = useCallback(
    (clickedEntityId: string) => {
      navigate(`/graph/${clickedEntityId}`);
    },
    [navigate]
  );

  const entityType = entityId?.split("_")[0] ?? "";
  const entityKey = entityId?.replace(/^[^_]+_/, "") ?? "";

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white px-8 py-6">
        <div className="max-w-none">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="text-sm text-zinc-500 hover:text-zinc-800 transition-colors"
            >
              ← Início
            </Link>
            <span className="text-zinc-300">/</span>
            <h1 className="text-2xl font-semibold text-zinc-900">
              Grafo —{" "}
              <span className="font-normal text-zinc-500">{entityType}</span>{" "}
              <span className="font-mono text-indigo-600">{entityKey}</span>
            </h1>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Explorador de conexões entre entidades parlamentares
          </p>
        </div>
      </header>

      {/* Controls bar */}
      <div className="border-b border-zinc-200 bg-white px-8 py-4">
        <div className="flex flex-wrap items-center gap-6">
          {/* Depth slider */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-zinc-700">
              Profundidade:{" "}
              <strong className="text-zinc-900">{depth}</strong>
            </span>
            <Slider
              value={[depth]}
              onValueChange={(v) => setDepth(v[0])}
              min={1}
              max={3}
              step={1}
              className="w-24"
            />
          </div>

          {/* Max nodes slider */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-zinc-700">
              Máx. nós:{" "}
              <strong className="text-zinc-900">{maxNodes}</strong>
            </span>
            <Slider
              value={[maxNodes]}
              onValueChange={(v) => setMaxNodes(v[0])}
              min={20}
              max={300}
              step={10}
              className="w-28"
            />
          </div>

          {/* Year select */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-700">Ano:</span>
            <Select
              value={year ? String(year) : "todos"}
              onValueChange={(v) =>
                setYear(v === "todos" ? undefined : Number(v))
              }
            >
              <SelectTrigger className="w-28 border-zinc-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {[2019, 2020, 2021, 2022, 2023, 2024].map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Zoom controls — pushed to the right */}
          <div className="ml-auto flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon-sm"
              className="border-zinc-300"
              onClick={() => canvasRef.current?.zoomIn()}
              title="Aproximar"
            >
              <Plus className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              className="border-zinc-300"
              onClick={() => canvasRef.current?.zoomOut()}
              title="Afastar"
            >
              <Minus className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              className="border-zinc-300"
              onClick={() => canvasRef.current?.fit()}
              title="Ajustar ao ecrã"
            >
              <Maximize2 className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Status bar */}
      {data && (
        <div className="border-b border-zinc-200 bg-zinc-50 px-8 py-2">
          <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
            <span>{data.nodes.length} nós</span>
            <span>{data.edges.length} arestas</span>
            {data.nodes.length >= maxNodes && (
              <span className="text-amber-500">
                limite atingido — aumente Máx. nós para ver mais
              </span>
            )}
            <span>
              Passe o mouse sobre uma aresta para ver o valor · Clique em um nó
              para navegar
            </span>
          </div>
        </div>
      )}

      {/* Graph area */}
      <div className="flex-1 px-8 py-6">
        {isLoading && (
          <div className="flex h-[600px] items-center justify-center rounded-lg border border-zinc-200 text-zinc-400">
            Carregando grafo...
          </div>
        )}

        {error && (
          <div className="flex h-48 items-center justify-center text-red-500">
            Entidade não encontrada ou erro ao carregar grafo.
          </div>
        )}

        {data && (
          <>
            <div className="flex overflow-hidden rounded-lg border border-zinc-200">
              <GraphCanvas
                ref={canvasRef}
                nodes={data.nodes}
                edges={data.edges}
                centerId={data.center_id}
                onNodeNavigate={handleNodeNavigate}
              />
            </div>

            <Legend />
          </>
        )}
      </div>
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
    <div className="mt-3 flex flex-wrap gap-5">
      {items.map(({ color, label }) => (
        <div key={label} className="flex items-center gap-1.5 text-sm text-zinc-500">
          <div
            className="size-2.5 shrink-0 rounded-full"
            style={{ background: color }}
          />
          {label}
        </div>
      ))}
    </div>
  );
}
