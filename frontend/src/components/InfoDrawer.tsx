import { useEffect } from "react";
import { Link } from "react-router-dom";
import type { GraphNode, GraphEdge } from "@/api/types";

interface InfoDrawerProps {
  node: GraphNode["data"] | null;
  allEdges: GraphEdge["data"][];
  allNodes: GraphNode[];
  onClose: () => void;
}

const fmtCompact = (n: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);

const fmtFull = (n: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(n);

const fmtCnpj = (raw: string): string => {
  const d = String(raw).replace(/\D/g, "");
  if (d.length === 14) {
    return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  }
  return raw;
};

const BADGE_LABELS: Record<string, string> = {
  deputy: "DEPUTADO",
  beneficiary: "BENEFICIÁRIO",
  party: "PARTIDO",
  state: "ESTADO",
  municipality: "MUNICÍPIO",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: 13,
  color: "#374151",
  padding: "3px 0",
};

const hrStyle: React.CSSProperties = {
  borderColor: "#e2e8f0",
  borderStyle: "solid",
  borderWidth: "1px 0 0 0",
  margin: "8px 0",
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "#64748b",
  marginBottom: 6,
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
};

export function InfoDrawer({
  node,
  allEdges,
  allNodes,
  onClose,
}: InfoDrawerProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!node) return null;

  const type = node.type as string;
  const nodeById = Object.fromEntries(allNodes.map((n) => [n.data.id, n.data]));

  const sentEdgesOut = allEdges.filter(
    (e) => e.type === "sent_amendment" && String(e.source) === String(node.id)
  );
  const sentEdgesIn = allEdges.filter(
    (e) => e.type === "sent_amendment" && String(e.target) === String(node.id)
  );

  return (
    <div
      style={{
        width: 280,
        flexShrink: 0,
        borderLeft: "1px solid #e2e8f0",
        background: "#fff",
        padding: "1rem",
        overflowY: "auto",
        maxHeight: 600,
        position: "relative",
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 16,
          color: "#94a3b8",
          lineHeight: 1,
          padding: 4,
        }}
        aria-label="Fechar"
      >
        ✕
      </button>

      {/* Badge */}
      <span
        style={{
          display: "inline-block",
          background: "#f1f5f9",
          color: "#64748b",
          fontSize: 10,
          fontWeight: 700,
          padding: "2px 6px",
          borderRadius: 4,
          marginBottom: 6,
          letterSpacing: "0.06em",
        }}
      >
        {BADGE_LABELS[type] ?? type.toUpperCase()}
      </span>

      {/* Name */}
      <div
        style={{
          fontWeight: 700,
          fontSize: "0.95rem",
          color: "#1e293b",
          marginBottom: 8,
          paddingRight: 24,
          lineHeight: 1.3,
        }}
      >
        {String(node.label)}
      </div>

      {type === "deputy" && (
        <DeputyContent
          node={node}
          sentEdgesOut={sentEdgesOut}
          nodeById={nodeById}
        />
      )}
      {type === "beneficiary" && (
        <BeneficiaryContent
          node={node}
          sentEdgesIn={sentEdgesIn}
          allEdges={allEdges}
          nodeById={nodeById}
        />
      )}
      {(type === "party" || type === "state" || type === "municipality") && (
        <GroupContent
          node={node}
          type={type}
          allEdges={allEdges}
          allNodes={allNodes}
        />
      )}
    </div>
  );
}

// ── Deputy ────────────────────────────────────────────────────────────────

function DeputyContent({
  node,
  sentEdgesOut,
  nodeById,
}: {
  node: GraphNode["data"];
  sentEdgesOut: GraphEdge["data"][];
  nodeById: Record<string, GraphNode["data"]>;
}) {
  const totalBrl = sentEdgesOut.reduce(
    (s, e) => s + (Number(e.amount_brl) || 0),
    0
  );
  const count = sentEdgesOut.length;

  const byTarget: Record<string, number> = {};
  sentEdgesOut.forEach((e) => {
    const id = String(e.target);
    byTarget[id] = (byTarget[id] || 0) + (Number(e.amount_brl) || 0);
  });
  const top5 = Object.entries(byTarget)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id, total]) => ({
      name: String(nodeById[id]?.label ?? id),
      total,
    }));

  return (
    <>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 10 }}>
        {String(node.party ?? "")} · {String(node.state ?? "")}
      </div>
      <hr style={hrStyle} />
      <div style={rowStyle}>
        <span>Total emendas</span>
        <strong style={{ color: "#1e293b" }}>{fmtFull(totalBrl)}</strong>
      </div>
      <div style={rowStyle}>
        <span>Nº de emendas</span>
        <strong style={{ color: "#1e293b" }}>{count}</strong>
      </div>
      {top5.length > 0 && (
        <>
          <hr style={hrStyle} />
          <div style={sectionLabelStyle}>Top beneficiários</div>
          {top5.map(({ name, total }) => (
            <div key={name} style={{ ...rowStyle, gap: 4 }}>
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                }}
                title={name}
              >
                {name}
              </span>
              <span style={{ flexShrink: 0, color: "#4f46e5", fontSize: 12 }}>
                {fmtCompact(total)}
              </span>
            </div>
          ))}
        </>
      )}
      <hr style={{ ...hrStyle, marginTop: 10 }} />
      <Link
        to={`/deputies/${node.camara_id}`}
        style={{
          display: "block",
          textAlign: "center",
          padding: "0.5rem",
          background: "#4f46e5",
          color: "#fff",
          borderRadius: 6,
          textDecoration: "none",
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        Ver perfil completo →
      </Link>
    </>
  );
}

// ── Beneficiary ───────────────────────────────────────────────────────────

function BeneficiaryContent({
  node,
  sentEdgesIn,
  allEdges,
  nodeById,
}: {
  node: GraphNode["data"];
  sentEdgesIn: GraphEdge["data"][];
  allEdges: GraphEdge["data"][];
  nodeById: Record<string, GraphNode["data"]>;
}) {
  const nodeId = String(node.id);
  const totalBrl = sentEdgesIn.reduce(
    (s, e) => s + (Number(e.amount_brl) || 0),
    0
  );

  // Resolve municipality and state via graph structure
  const partOfEdge = allEdges.find(
    (e) => e.type === "part_of" && String(e.source) === nodeId
  );
  const municipalityNode = partOfEdge
    ? nodeById[String(partOfEdge.target)]
    : null;
  const locatedInEdge = municipalityNode
    ? allEdges.find(
        (e) =>
          e.type === "located_in" &&
          String(e.source) === String(municipalityNode.id)
      )
    : null;
  const stateNode = locatedInEdge
    ? nodeById[String(locatedInEdge.target)]
    : null;

  // Year breakdown
  const byYear: Record<string, number> = {};
  sentEdgesIn.forEach((e) => {
    const y = String(e.year ?? "?");
    byYear[y] = (byYear[y] || 0) + (Number(e.amount_brl) || 0);
  });
  const years = Object.entries(byYear).sort(
    ([a], [b]) => Number(b) - Number(a)
  );
  const maxAmt = Math.max(...Object.values(byYear), 1);

  const locationParts = [
    municipalityNode?.label,
    stateNode?.label,
  ].filter(Boolean) as string[];

  return (
    <>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 2 }}>
        {fmtCnpj(String(node.cnpj_cpf ?? ""))}
      </div>
      {locationParts.length > 0 && (
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
          {locationParts.join(" · ")}
        </div>
      )}
      <hr style={hrStyle} />
      <div style={rowStyle}>
        <span>Total recebido</span>
        <strong style={{ color: "#1e293b" }}>{fmtFull(totalBrl)}</strong>
      </div>
      {years.length > 0 && (
        <>
          <hr style={hrStyle} />
          <div style={sectionLabelStyle}>Por ano</div>
          {years.map(([year, amt]) => (
            <div key={year} style={{ marginBottom: 6 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  marginBottom: 3,
                  color: "#374151",
                }}
              >
                <span>{year}</span>
                <span style={{ color: "#4f46e5" }}>{fmtCompact(amt)}</span>
              </div>
              <div
                style={{ background: "#e2e8f0", height: 5, borderRadius: 3 }}
              >
                <div
                  style={{
                    background: "#818cf8",
                    height: 5,
                    borderRadius: 3,
                    width: `${(amt / maxAmt) * 100}%`,
                    transition: "width 0.3s",
                  }}
                />
              </div>
            </div>
          ))}
        </>
      )}
      <hr style={hrStyle} />
      <button
        onClick={() =>
          navigator.clipboard.writeText(String(node.cnpj_cpf ?? ""))
        }
        style={{
          display: "block",
          width: "100%",
          padding: "0.5rem",
          background: "#f1f5f9",
          color: "#374151",
          border: "1px solid #e2e8f0",
          borderRadius: 6,
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        Copiar CNPJ
      </button>
    </>
  );
}

// ── Party / State / Municipality ──────────────────────────────────────────

function GroupContent({
  node,
  type,
  allEdges,
  allNodes,
}: {
  node: GraphNode["data"];
  type: string;
  allEdges: GraphEdge["data"][];
  allNodes: GraphNode[];
}) {
  const nodeId = String(node.id);

  let connectedDeputyIds: Set<string>;

  if (type === "municipality") {
    // Beneficiaries that are PART_OF this municipality
    const beneficiaryIds = new Set(
      allEdges
        .filter((e) => e.type === "part_of" && String(e.target) === nodeId)
        .map((e) => String(e.source))
    );
    // Deputies that sent amendments to those beneficiaries
    connectedDeputyIds = new Set(
      allEdges
        .filter(
          (e) =>
            e.type === "sent_amendment" &&
            beneficiaryIds.has(String(e.target))
        )
        .map((e) => String(e.source))
    );
  } else {
    // Party: Deputy -MEMBER_OF-> Party  |  State: Deputy -REPRESENTS-> State
    const edgeType = type === "party" ? "member_of" : "represents";
    connectedDeputyIds = new Set(
      allEdges
        .filter((e) => e.type === edgeType && String(e.target) === nodeId)
        .map((e) => String(e.source))
    );
  }

  const deputyCount = allNodes.filter(
    (n) =>
      connectedDeputyIds.has(String(n.data.id)) && n.data.type === "deputy"
  ).length;

  const totalBrl = allEdges
    .filter(
      (e) =>
        e.type === "sent_amendment" &&
        connectedDeputyIds.has(String(e.source))
    )
    .reduce((s, e) => s + (Number(e.amount_brl) || 0), 0);

  return (
    <>
      <hr style={hrStyle} />
      <div style={rowStyle}>
        <span>Deputados conectados</span>
        <strong style={{ color: "#1e293b" }}>{deputyCount}</strong>
      </div>
      <div style={rowStyle}>
        <span>Total emendas</span>
        <strong style={{ color: "#1e293b" }}>{fmtFull(totalBrl)}</strong>
      </div>
    </>
  );
}
