export interface StatsSummary {
  total_deputies: number;
  total_beneficiaries: number;
  total_amendments_brl: number;
  latest_amendment_year: number | null;
  last_sync_at: string | null;
}

export interface Deputy {
  camara_id: number;
  name: string;
  party: string | null;
  state: string | null;
  photo_url: string | null;
  total_amendments_brl: number;
}

export interface DeputyDetail {
  camara_id: number;
  name: string;
  party: string | null;
  state: string | null;
  photo_url: string | null;
  stats: {
    total_amendments_brl: number;
    amendment_count: number;
  };
}

export interface Amendment {
  amendment_code: string;
  beneficiary_name: string;
  beneficiary_cnpj: string;
  amount_brl: number;
  year: number;
  amendment_type: string | null;
}

export interface PaginatedDeputies {
  total: number;
  items: Deputy[];
}

export interface PaginatedAmendments {
  total: number;
  items: Amendment[];
}

export interface GraphNode {
  data: {
    id: string;
    label: string;
    type: string;
    [key: string]: unknown;
  };
}

export interface GraphEdge {
  data: {
    id: string;
    source: string;
    target: string;
    type: string;
    [key: string]: unknown;
  };
}

export interface GraphResponse {
  center_id: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface TopSpendersResponse {
  items: Array<{
    camara_id: number;
    name: string;
    party: string | null;
    state: string | null;
    total_brl: number;
    graph_id: string;
  }>;
}
