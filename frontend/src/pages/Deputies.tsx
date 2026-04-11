import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "@/api/client";
import type { PaginatedDeputies } from "@/api/types";

const STATES = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);

const PAGE_SIZE = 50;

export function Deputies() {
  const [searchParams, setSearchParams] = useSearchParams();
  const party = searchParams.get("party") ?? "";
  const state = searchParams.get("state") ?? "";
  const [page, setPage] = useState(0);

  const { data, isLoading, error } = useQuery<PaginatedDeputies>({
    queryKey: ["deputies", party, state, page],
    queryFn: () =>
      api.deputies.list({
        party: party || undefined,
        state: state || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }) as Promise<PaginatedDeputies>,
  });

  function setFilter(key: string, value: string) {
    setPage(0);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  }

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "2rem 1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "1.5rem" }}>
        <Link to="/" style={{ color: "#4f46e5", textDecoration: "none", fontSize: 14 }}>
          ← Início
        </Link>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>Deputados</h1>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: "1.5rem" }}>
        <select
          value={party}
          onChange={(e) => setFilter("party", e.target.value)}
          style={selectStyle}
        >
          <option value="">Todos os partidos</option>
          {PARTIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>

        <select
          value={state}
          onChange={(e) => setFilter("state", e.target.value)}
          style={selectStyle}
        >
          <option value="">Todos os estados</option>
          {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        {(party || state) && (
          <button
            onClick={() => { setFilter("party", ""); setFilter("state", ""); }}
            style={{ ...selectStyle, cursor: "pointer", color: "#ef4444" }}
          >
            Limpar
          </button>
        )}
      </div>

      {isLoading && <p>Carregando...</p>}
      {error && <p style={{ color: "red" }}>Erro ao carregar deputados.</p>}

      {data && (
        <>
          <p style={{ color: "#64748b", fontSize: 13, marginBottom: 8 }}>
            {data.total} deputados encontrados
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                <th style={thStyle}>Nome</th>
                <th style={thStyle}>Partido</th>
                <th style={thStyle}>Estado</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Total Emendas</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((d) => (
                <tr key={d.camara_id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={tdStyle}>
                    <Link to={`/deputies/${d.camara_id}`} style={{ color: "#4f46e5", textDecoration: "none" }}>
                      {d.name}
                    </Link>
                  </td>
                  <td style={tdStyle}>{d.party ?? "—"}</td>
                  <td style={tdStyle}>{d.state ?? "—"}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {fmt(d.total_amendments_brl)}
                  </td>
                  <td style={tdStyle}>
                    <Link to={`/graph/deputy_${d.camara_id}`} style={{ color: "#10b981", fontSize: 12 }}>
                      Grafo
                    </Link>
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
                Página {page + 1} / {totalPages}
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

const PARTIES = [
  "PT","PL","PP","REPUBLICANOS","UNIÃO","MDB","PSD","PSDB","SOLIDARIEDADE",
  "PODE","PDT","PSB","PSOL","AVANTE","CIDADANIA","PRD","DC","NOVO","PATRIOTA",
  "PMB","AGIR","UP","PCdoB","PV","PMN","PRTB",
];

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
