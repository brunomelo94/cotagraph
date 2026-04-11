import { useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import cytoscape from "cytoscape";
import type { GraphNode, GraphEdge } from "@/api/types";

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  centerId?: string;
  onNodeNavigate?: (entityId: string) => void;
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

const fmtTooltip = (amount: number, year: number | undefined): string => {
  const formatted = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
  return year !== undefined ? `${formatted} · Ano: ${year}` : formatted;
};

export const GraphCanvas = forwardRef<GraphCanvasHandle, Props>(
  function GraphCanvas({ nodes, edges, centerId, onNodeNavigate }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const cyRef = useRef<cytoscape.Core | null>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

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
          // Base node: labels hidden by default, with smooth fade
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
              "transition-property": "text-opacity",
              "transition-duration": 200,
              "transition-timing-function": "linear",
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
          // Deputies: slightly larger, 10px font — labels shown via zoom-medium class
          {
            selector: 'node[type="deputy"]',
            style: {
              width: 26,
              height: 26,
              "font-size": 10,
            } as cytoscape.Css.Node,
          },
          // Center/focus node — always labeled, larger, indigo glow
          ...(centerId
            ? [
                {
                  selector: `[id = "${centerId}"]`,
                  style: {
                    width: 46,
                    height: 46,
                    "border-width": 4,
                    "border-color": "#ffffff",
                    "text-opacity": 1,
                    "font-size": 13,
                    "font-weight": 700,
                    "shadow-blur": 16,
                    "shadow-color": "#4f46e5",
                    "shadow-opacity": 0.7,
                    "shadow-offset-x": 0,
                    "shadow-offset-y": 0,
                  } as cytoscape.Css.Node,
                },
              ]
            : []),
          // Zoom-based: beneficiary + municipality at zoom >= 1.5
          {
            selector:
              'node[type="beneficiary"].zoom-high, node[type="municipality"].zoom-high',
            style: { "text-opacity": 1 } as cytoscape.Css.Node,
          },
          // Zoom-based: party + state at zoom >= 2.0
          {
            selector:
              'node[type="party"].zoom-veryhigh, node[type="state"].zoom-veryhigh',
            style: { "text-opacity": 1 } as cytoscape.Css.Node,
          },
          // Hide all labels when zoom < 0.6 (overrides center node always-on)
          {
            selector: "node.zoom-hidden",
            style: { "text-opacity": 0 } as cytoscape.Css.Node,
          },
          // Base edges: structural (gray, thin, low opacity)
          {
            selector: "edge",
            style: {
              width: 1,
              "line-color": "#cbd5e1",
              "curve-style": "bezier",
              "target-arrow-shape": "triangle",
              "target-arrow-color": "#cbd5e1",
              "arrow-scale": 0.5,
              opacity: 0.4,
            },
          },
          // SENT_AMENDMENT edges: width from data(weight), indigo color
          {
            selector: 'edge[type="sent_amendment"]',
            style: {
              "line-color": "#818cf8",
              "target-arrow-color": "#818cf8",
              width: "data(weight)",
              opacity: 0.7,
            },
          },
          // Hover highlight
          {
            selector: "node.hovered",
            style: {
              "text-opacity": 1,
              "border-width": 2,
              "border-color": "#ffffff",
              "z-index": 999,
            } as cytoscape.Css.Node,
          },
          { selector: "node.dimmed", style: { opacity: 0.2 } },
          { selector: "edge.dimmed", style: { opacity: 0.08 } },
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

      // ── Edge weight computation (log scale, 1–5px) ─────────────────────
      const sentEdges = cy.edges('[type="sent_amendment"]');
      if (sentEdges.length > 0) {
        const amounts: number[] = [];
        sentEdges.forEach((e) => {
          amounts.push(Math.max(Number(e.data("amount_brl")) || 1, 1));
        });
        const logMin = Math.log(Math.min(...amounts));
        const logMax = Math.log(Math.max(...amounts));
        sentEdges.forEach((e) => {
          const amt = Math.max(Number(e.data("amount_brl")) || 1, 1);
          const weight =
            logMax === logMin
              ? 3
              : 1 + 4 * ((Math.log(amt) - logMin) / (logMax - logMin));
          e.data("weight", weight);
        });
      } else {
        cy.edges().forEach((e) => { e.data("weight", 2); });
      }

      // ── Fit + entrance pulse on center node ───────────────────────────
      cy.ready(() => {
        cy.fit(undefined, 40);
        if (centerId) {
          const centerNode = cy.getElementById(centerId);
          centerNode.animate(
            { style: { "border-width": 10, "border-color": "#a5b4fc", "shadow-opacity": 1 } as cytoscape.Css.Node },
            {
              duration: 350,
              easing: "ease-in-out",
              complete: () => {
                centerNode.animate(
                  { style: { "border-width": 4, "border-color": "#ffffff", "shadow-opacity": 0.7 } as cytoscape.Css.Node },
                  { duration: 350, easing: "ease-in-out" }
                );
              },
            }
          );
        }
      });

      // ── Zoom-based label class toggling ───────────────────────────────
      cy.on("zoom", () => {
        const z = cy.zoom();
        const allNodes = cy.nodes();
        if (z < 0.6) {
          allNodes.addClass("zoom-hidden");
          allNodes.removeClass("zoom-high zoom-veryhigh");
        } else {
          allNodes.removeClass("zoom-hidden");
          if (z >= 1.5) {
            allNodes.addClass("zoom-high");
          } else {
            allNodes.removeClass("zoom-high");
          }
          if (z >= 2.0) {
            allNodes.addClass("zoom-veryhigh");
          } else {
            allNodes.removeClass("zoom-veryhigh");
          }
        }
      });

      // ── Edge tooltip ───────────────────────────────────────────────────
      cy.on("mouseover", 'edge[type="sent_amendment"]', (evt) => {
        if (!tooltipRef.current || !containerRef.current) return;
        const edge = evt.target as cytoscape.EdgeSingular;
        const amount = Number(edge.data("amount_brl")) || 0;
        const year = edge.data("year") as number | undefined;
        tooltipRef.current.textContent = fmtTooltip(amount, year);
        tooltipRef.current.style.display = "block";
        const rect = containerRef.current.getBoundingClientRect();
        const mx = (evt.originalEvent as MouseEvent).clientX - rect.left + 12;
        const my = (evt.originalEvent as MouseEvent).clientY - rect.top - 34;
        tooltipRef.current.style.left = `${mx}px`;
        tooltipRef.current.style.top = `${my}px`;
      });

      cy.on("mouseout", "edge", () => {
        if (tooltipRef.current) tooltipRef.current.style.display = "none";
      });

      // ── Node hover: dim others, show label ────────────────────────────
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

      // ── Node tap → navigate to entity (Stoplight) ─────────────────────
      if (onNodeNavigate) {
        cy.on("tap", "node", (evt) => {
          const node = evt.target as cytoscape.NodeSingular;
          onNodeNavigate(node.data("id") as string);
        });
      }

      cyRef.current = cy;
      return () => {
        cy.destroy();
        cyRef.current = null;
      };
    }, [nodes, edges, centerId, onNodeNavigate]);

    return (
      <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
        <div
          ref={containerRef}
          style={{
            width: "100%",
            height: "600px",
            background: "#f8fafc",
            cursor: "grab",
          }}
        />
        {/* Edge hover tooltip */}
        <div
          ref={tooltipRef}
          style={{
            display: "none",
            position: "absolute",
            background: "#1e293b",
            color: "#fff",
            padding: "4px 8px",
            borderRadius: 4,
            fontSize: 12,
            pointerEvents: "none",
            whiteSpace: "nowrap",
            zIndex: 10,
            boxShadow: "0 2px 4px rgba(0,0,0,0.25)",
          }}
        />
      </div>
    );
  }
);
