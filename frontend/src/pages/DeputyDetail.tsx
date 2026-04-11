import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api } from "@/api/client";
import type { DeputyDetail as IDeputyDetail, PaginatedAmendments } from "@/api/types";

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(n);

const fmtNum = (n: number) => new Intl.NumberFormat("pt-BR").format(n);

const PAGE_SIZE = 50;

export function DeputyDetail() {
  const { camaraId } = useParams<{ camaraId: string }>();
  const id = Number(camaraId);
  const [page, setPage] = useState(0);
  const [year, setYear] = useState<number | undefined>(undefined);

  const { data: deputy, isLoading: depLoading } = useQuery<IDeputyDetail>({
    queryKey: ["deputy", id],
    queryFn: () => api.deputies.get(id) as Promise<IDeputyDetail>,
    enabled: !isNaN(id),
  });

  const { data: amendments, isLoading: amLoading } = useQuery<PaginatedAmendments>({
    queryKey: ["amendments", id, year, page],
    queryFn: () =>
      api.deputies.amendments(id, { year, limit: PAGE_SIZE, offset: page * PAGE_SIZE }) as Promise<PaginatedAmendments>,
    enabled: !isNaN(id),
  });

  const totalPages = amendments ? Math.ceil(amendments.total / PAGE_SIZE) : 0;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "2rem 1rem" }}>
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: "1.5rem" }}>
        <Link to="/deputies" style={{ color: "#4f46e5", textDecoration: "none", fontSize: 14 }}>
          ← Deputados
        </Link>
      </div>

      {depLoading && <p>Carregando...</p>}

      {deputy && (
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "1.5rem", marginBottom: "1rem" }}>
            {deputy.photo_url && (
              <img
                src={deputy.photo_url}
                alt={deputy.name}
                style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover" }}
              />
            )}
            <div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>{deputy.name}</h1>
              <p style={{ color: "#64748b", margin: "4px 0" }}>
                {[deputy.party, deputy.state].filter(Boolean).join(" · ")}
              </p>
              <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                <Stat label="Total emendas" value={fmt(deputy.stats.total_amendments_brl)} />
                <Stat label="Nº emendas" value={fmtNum(deputy.stats.amendment_count)} />
              </div>
            </div>
          </div>
          <Link
            to={`/graph/deputy_${deputy.camara_id}`}
            style={{
              display: "inline-block",
              padding: "0.5rem 1rem",
              background: "#10b981",
              color: "#fff",
              borderRadius: 6,
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Ver no Grafo
          </Link>
        </div>
      )}

      <div style={{ marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 8 }}>Emendas</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select
            value={year ?? ""}
            onChange={(e) => { setYear(e.target.value ? Number(e.target.value) : undefined); setPage(0); }}
            style={selectStyle}
          >
            <option value="">Todos os anos</option>
            {[2019, 2020, 2021, 2022, 2023, 2024].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {amendments && (
            <span style={{ color: "#64748b", fontSize: 13 }}>{amendments.total} emendas</span>
          )}
        </div>
      </div>

      {amLoading && <p>Carregando emendas...</p>}

      {amendments && (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                <th style={thStyle}>Beneficiário</th>
                <th style={thStyle}>CNPJ</th>
                <th style={thStyle}>Código Emenda</th>
                <th style={thStyle}>Tipo</th>
                <th style={thStyle}>Ano</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {amendments.items.map((a, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={tdStyle}>{a.beneficiary_name}</td>
                  <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 12 }}>{a.beneficiary_cnpj}</td>
                  <td style={{ ...tdStyle, fontSize: 12 }}>{a.amendment_code}</td>
                  <td style={tdStyle}>{a.amendment_type ?? "—"}</td>
                  <td style={tdStyle}>{a.year}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {fmt(a.amount_brl)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "center" }}>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={btnStyle}>
                Anterior
              </button>
              <span style={{ padding: "0.4rem 0.8rem", fontSize: 14 }}>
                {page + 1} / {totalPages}
              </span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} style={btnStyle}>
                Próxima
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "#94a3b8" }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{value}</div>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "0.4rem 0.7rem",
  border: "1px solid #e2e8f0",
  borderRadius: 6,
  background: "#fff",
  fontSize: 14,
};

const thStyle: React.CSSProperties = { padding: "0.6rem 0.75rem", fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: "0.55rem 0.75rem" };
const btnStyle: React.CSSProperties = {
  padding: "0.4rem 0.8rem",
  border: "1px solid #e2e8f0",
  borderRadius: 6,
  background: "#fff",
  cursor: "pointer",
  fontSize: 14,
};
