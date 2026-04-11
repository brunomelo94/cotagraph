import { useRef, useEffect } from "react";
import cytoscape, { ElementDefinition } from "cytoscape";
import type { GraphNode, GraphEdge } from "@/api/types";

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeTap?: (nodeId: string) => void;
}

const NODE_COLORS: Record<string, string> = {
  deputy: "#4f46e5",
  beneficiary: "#10b981",
  party: "#f59e0b",
  state: "#ef4444",
  municipality: "#8b5cf6",
};

export function GraphCanvas({ nodes, edges, onNodeTap }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const elements: ElementDefinition[] = [
      ...nodes.map((n) => ({ data: n.data })),
      ...edges.map((e) => ({ data: e.data })),
    ];

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            "font-size": 9,
            "text-valign": "bottom",
            "text-margin-y": 4,
            width: 24,
            height: 24,
            "background-color": "#94a3b8",
            color: "#1e293b",
          },
        },
        ...Object.entries(NODE_COLORS).map(([type, color]) => ({
          selector: `node[type="${type}"]`,
          style: { "background-color": color },
        })),
        {
          selector: "edge",
          style: {
            width: 1,
            "line-color": "#cbd5e1",
            "curve-style": "bezier" as const,
            "target-arrow-shape": "triangle" as const,
            "target-arrow-color": "#cbd5e1",
            "arrow-scale": 0.6,
          },
        },
        {
          selector: "edge[type='sent_amendment']",
          style: { "line-color": "#6366f1", "target-arrow-color": "#6366f1", width: 1.5 },
        },
      ],
      layout: { name: "cose" } as cytoscape.LayoutOptions,
    });

    if (onNodeTap) {
      cy.on("tap", "node", (evt) => {
        onNodeTap(evt.target.id() as string);
      });
    }

    return () => cy.destroy();
  }, [nodes, edges, onNodeTap]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "600px",
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        background: "#f8fafc",
      }}
    />
  );
}
