import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/api/client";
import type { StatsSummary } from "@/api/types";

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);

const fmtNum = (n: number) => new Intl.NumberFormat("pt-BR").format(n);

export function Dashboard() {
  const { data, isLoading, error } = useQuery<StatsSummary>({
    queryKey: ["stats"],
    queryFn: () => api.stats.summary() as Promise<StatsSummary>,
  });

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 8 }}>Cotagraph</h1>
      <p style={{ color: "#64748b", marginBottom: "2rem" }}>
        Transparência nas emendas parlamentares brasileiras
      </p>

      {isLoading && <p>Carregando...</p>}
      {error && <p style={{ color: "red" }}>Erro ao carregar dados.</p>}

      {data && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: "2rem" }}>
          <StatCard label="Deputados" value={fmtNum(data.total_deputies)} />
          <StatCard label="Beneficiários" value={fmtNum(data.total_beneficiaries)} />
          <StatCard label="Total Emendas" value={fmt(data.total_amendments_brl)} />
          <StatCard label="Ano mais recente" value={String(data.latest_amendment_year ?? "—")} />
        </div>
      )}

      {data?.last_sync_at && (
        <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: "2rem" }}>
          Última sincronização: {new Date(data.last_sync_at).toLocaleString("pt-BR")}
        </p>
      )}

      <div style={{ display: "flex", gap: 12 }}>
        <Link to="/deputies" style={btnStyle}>
          Ver Deputados
        </Link>
        <Link to="/graph/deputy_4497" style={{ ...btnStyle, background: "#10b981" }}>
          Explorar Grafo
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "#f1f5f9",
        borderRadius: 8,
        padding: "1.25rem",
        border: "1px solid #e2e8f0",
      }}
    >
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#1e293b" }}>{value}</div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "0.6rem 1.25rem",
  background: "#4f46e5",
  color: "#fff",
  borderRadius: 6,
  textDecoration: "none",
  fontWeight: 500,
  fontSize: 14,
};
