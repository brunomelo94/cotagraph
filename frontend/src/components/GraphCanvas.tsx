import { useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import cytoscape from "cytoscape";
import type { GraphNode, GraphEdge } from "@/api/types";

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  centerId?: string;
  onNodeTap?: (nodeId: string) => void;
}

export interface GraphCanvasHandle {
  fit: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

const NODE_COLORS: Record<string, string> = {
  deputy: "#4f46e5",
  beneficiary: "#10b981",
  party: "#f59e0b",
  state: "#ef4444",
  municipality: "#8b5cf6",
};

export const GraphCanvas = forwardRef<GraphCanvasHandle, Props>(
  function GraphCanvas({ nodes, edges, centerId, onNodeTap }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const cyRef = useRef<cytoscape.Core | null>(null);

    useImperativeHandle(ref, () => ({
      fit: () => cyRef.current?.fit(undefined, 40),
      zoomIn: () => cyRef.current?.zoom(cyRef.current.zoom() * 1.3),
      zoomOut: () => cyRef.current?.zoom(cyRef.current.zoom() * 0.75),
    }));

    useEffect(() => {
      if (!containerRef.current) return;

      const elements: cytoscape.ElementDefinition[] = [
        ...nodes.map((n) => ({ data: n.data })),
        ...edges.map((e) => ({ data: e.data })),
      ];

      const cy = cytoscape({
        container: containerRef.current,
        elements,
        style: [
          // Base node: labels hidden, shown on hover
          {
            selector: "node",
            style: {
              label: "data(label)",
              "font-size": 11,
              "font-weight": 600,
              "text-valign": "bottom",
              "text-halign": "center",
              "text-margin-y": 5,
              "text-opacity": 0,
              "text-outline-width": 2,
              "text-outline-color": "#ffffff",
              color: "#1e293b",
              width: 20,
              height: 20,
              "background-color": "#94a3b8",
              "border-width": 0,
              "border-color": "#ffffff",
            },
          },
          // Type-specific colors
          ...Object.entries(NODE_COLORS).map(([type, color]) => ({
            selector: `node[type="${type}"]`,
            style: { "background-color": color },
          })),
          // Deputies slightly larger
          {
            selector: `node[type="deputy"]`,
            style: { width: 26, height: 26 },
          },
          // Center/focus node — always labeled, larger, white ring
          ...(centerId
            ? [
                {
                  selector: `[id = "${centerId}"]`,
                  style: {
                    width: 36,
                    height: 36,
                    "border-width": 3,
                    "border-color": "#ffffff",
                    "text-opacity": 1,
                    "font-size": 13,
                  } as cytoscape.Css.Node,
                },
              ]
            : []),
          // Edges
          {
            selector: "edge",
            style: {
              width: 1,
              "line-color": "#cbd5e1",
              "curve-style": "bezier",
              "target-arrow-shape": "triangle",
              "target-arrow-color": "#cbd5e1",
              "arrow-scale": 0.5,
              opacity: 0.5,
            },
          },
          {
            selector: `edge[type="sent_amendment"]`,
            style: {
              "line-color": "#818cf8",
              "target-arrow-color": "#818cf8",
              width: 1.5,
              opacity: 0.7,
            },
          },
          // Hover — show label, highlight ring
          {
            selector: "node.hovered",
            style: {
              "text-opacity": 1,
              "border-width": 2,
              "border-color": "#ffffff",
              "z-index": 999,
            } as cytoscape.Css.Node,
          },
          // Dim everything not in neighborhood
          {
            selector: "node.dimmed",
            style: { opacity: 0.2 },
          },
          {
            selector: "edge.dimmed",
            style: { opacity: 0.08 },
          },
        ],
        layout: {
          name: "cose",
          animate: false,
          nodeRepulsion: 12000,
          idealEdgeLength: 90,
          edgeElasticity: 150,
          gravity: 0.8,
          numIter: 1000,
          initialTemp: 250,
          coolingFactor: 0.95,
          minTemp: 1,
        } as cytoscape.LayoutOptions,
        minZoom: 0.1,
        maxZoom: 4,
      });

      // Fit after layout
      cy.ready(() => cy.fit(undefined, 40));

      // Show label + highlight neighborhood on hover
      cy.on("mouseover", "node", (evt) => {
        const node = evt.target as cytoscape.NodeSingular;
        const neighborhood = node.closedNeighborhood();
        cy.elements().not(neighborhood).addClass("dimmed");
        neighborhood.removeClass("dimmed");
        node.addClass("hovered");
      });

      cy.on("mouseout", "node", () => {
        cy.elements().removeClass("dimmed hovered");
      });

      // Navigate on tap
      if (onNodeTap) {
        cy.on("tap", "node", (evt) => {
          onNodeTap((evt.target as cytoscape.NodeSingular).id());
        });
      }

      cyRef.current = cy;
      return () => {
        cy.destroy();
        cyRef.current = null;
      };
    }, [nodes, edges, centerId, onNodeTap]);

    return (
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "600px",
          border: "1px solid #e2e8f0",
          borderRadius: 8,
          background: "#f8fafc",
          cursor: "grab",
        }}
      />
    );
  }
);
