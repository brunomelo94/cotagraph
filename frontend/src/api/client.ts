const BASE = import.meta.env.VITE_API_URL ?? "";

type Params = Record<string, string | number | boolean | undefined | null>;

async function get<T>(path: string, params?: Params): Promise<T> {
  const url = new URL(`${BASE}${path}`, window.location.origin);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, String(v));
      }
    }
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

export const api = {
  stats: {
    summary: () => get("/api/v1/stats/summary"),
  },
  deputies: {
    list: (params?: { party?: string; state?: string; limit?: number; offset?: number }) =>
      get("/api/v1/deputies", params),
    get: (camaraId: number) => get(`/api/v1/deputies/${camaraId}`),
    amendments: (camaraId: number, params?: { year?: number; limit?: number; offset?: number }) =>
      get(`/api/v1/deputies/${camaraId}/amendments`, params),
  },
  graph: {
    subgraph: (entityId: string, params?: { depth?: number; max_nodes?: number; year?: number }) =>
      get(`/api/v1/graph/${entityId}`, params),
    topSpenders: (params?: { year?: number; limit?: number }) =>
      get("/api/v1/graph/top-spenders", params),
  },
};
