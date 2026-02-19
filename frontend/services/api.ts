// api.ts (completo)
// - Produção: VITE_API_BASE=/api  (via Nginx proxy)
// - Dev local: VITE_API_BASE=http://127.0.0.1:8000/api
// Observação: com API_BASE = "/api", NÃO use "/api" de novo nos endpoints.

export const API_BASE: string = import.meta.env.VITE_API_BASE ?? "/api";

// -------------------- HELPERS -------------------- //

type ApiError = { detail?: string; message?: string; [k: string]: any };

async function readBodyOnce(res: Response): Promise<{ raw: string; json: any | null }> {
  const raw = await res.text(); // ✅ lê 1 vez apenas
  try {
    return { raw, json: raw ? JSON.parse(raw) : null };
  } catch {
    return { raw, json: null };
  }
}

function formatError(status: number, raw: string, json: ApiError | null) {
  const msg =
    (json && (json.detail || json.message)) ||
    (json ? JSON.stringify(json) : "") ||
    raw ||
    `Erro ${status}`;
  return msg;
}

function authHeaders(access: string) {
  if (!access) throw new Error("Token ausente. Faça login novamente.");
  return { Authorization: `Bearer ${access}` };
}

function withQuery(path: string, params?: Record<string, string | number | boolean | null | undefined>) {
  if (!params) return path;
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
  if (!entries.length) return path;

  const qs = new URLSearchParams();
  for (const [k, v] of entries) qs.set(k, String(v));

  return `${path}${path.includes("?") ? "&" : "?"}${qs.toString()}`;
}

// -------------------- AUTH -------------------- //

export type TokenPair = { access: string; refresh: string };

export async function login(username: string, password: string): Promise<TokenPair> {
  const res = await fetch(`${API_BASE}/auth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const { raw, json } = await readBodyOnce(res);

  if (!res.ok) {
    throw new Error(`Falha no login: ${res.status} ${formatError(res.status, raw, json)}`);
  }

  if (!json?.access || !json?.refresh) {
    throw new Error("Falha no login: resposta inválida do servidor.");
  }

  return json as TokenPair;
}

export type Me = {
  id: number;
  username: string;
  email: string;
  is_staff: boolean;
  is_superuser: boolean;
};

export async function fetchMe(accessToken: string): Promise<Me> {
  const res = await fetch(`${API_BASE}/auth/me/`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const { raw, json } = await readBodyOnce(res);

  if (!res.ok) {
    throw new Error(`Falha ao carregar usuário: ${res.status} ${formatError(res.status, raw, json)}`);
  }

  return json as Me;
}

// -------------------- DASHBOARD SUMMARY -------------------- //

export type DashboardSummary = {
  balance_capital_cents: number;
  pending_cents: number;
  approved_count: number;
  pending_count: number;
};

export async function getDashboardSummary(access: string): Promise<DashboardSummary> {
  const res = await fetch(`${API_BASE}/dashboard/summary/`, {
    headers: authHeaders(access),
  });

  const { raw, json } = await readBodyOnce(res);

  if (!res.ok) {
    throw new Error(`Falha ao carregar resumo: ${res.status} ${formatError(res.status, raw, json)}`);
  }

  return json as DashboardSummary;
}

// -------------------- PIX -------------------- //

export type PixChargeResponse = {
  pix_code: string;
  external_ref: string;
  qr_code_base64?: string;
};

export async function createPixCharge(access: string, amount: number): Promise<PixChargeResponse> {
  const res = await fetch(`${API_BASE}/pix/charge/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(access),
    },
    body: JSON.stringify({ amount }),
  });

  const { raw, json } = await readBodyOnce(res);

  if (!res.ok) {
    throw new Error(`Falha ao gerar Pix: ${res.status} ${formatError(res.status, raw, json)}`);
  }

  return json as PixChargeResponse;
}

// -------------------- INVESTMENT -------------------- //

export type InvestmentItem = {
  id: number | string;
  amount_cents: number;
  amount?: number; // se o serializer mandar
  status: "PENDING" | "APPROVED" | "REJECTED" | string;
  paid_at: string | null;
  external_ref: string | null;
  created_at: string;
};

export async function createInvestment(
  access: string,
  data: { amount: number; external_ref?: string; paid_at?: string }
) {
  const res = await fetch(`${API_BASE}/investments/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(access),
    },
    body: JSON.stringify(data),
  });

  const { raw, json } = await readBodyOnce(res);

  if (!res.ok) {
    throw new Error(`Falha ao registrar aporte: ${res.status} ${formatError(res.status, raw, json)}`);
  }

  return json;
}

export async function listInvestments(access: string): Promise<InvestmentItem[]> {
  const res = await fetch(`${API_BASE}/investments/`, {
    headers: authHeaders(access),
  });

  const { raw, json } = await readBodyOnce(res);

  if (!res.ok) {
    throw new Error(`Falha ao listar aportes: ${res.status} ${formatError(res.status, raw, json)}`);
  }

  return (json ?? []) as InvestmentItem[];
}

// -------------------- SUMMARY -------------------- //

export async function getMeSummary(access: string) {
  const res = await fetch(`${API_BASE}/me/summary/`, {
    headers: authHeaders(access),
  });

  const { raw, json } = await readBodyOnce(res);

  if (!res.ok) {
    throw new Error(`Falha ao buscar resumo: ${res.status} ${formatError(res.status, raw, json)}`);
  }

  return json as Promise<{
    total_invested: number;
    count_investments: number;
  }>;
}

// -------------------- ADMIN -------------------- //

export type AdminInvestmentItem = {
  id: number;
  amount_cents: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | string;
  paid_at: string | null;
  external_ref: string | null;
  created_at: string;

  // do serializer admin (select_related user)
  user_id?: number;
  username?: string;
  email?: string;
};

export async function listAdminInvestments(
  access: string,
  status?: string
): Promise<AdminInvestmentItem[]> {
  const url = withQuery(`${API_BASE}/admin/investments/`, { status });

  const res = await fetch(url, {
    headers: authHeaders(access),
  });

  const { raw, json } = await readBodyOnce(res);

  if (!res.ok) {
    throw new Error(`Falha ao listar admin investments: ${res.status} ${formatError(res.status, raw, json)}`);
  }

  return (json ?? []) as AdminInvestmentItem[];
}

export async function approveInvestment(access: string, id: number | string) {
  const res = await fetch(`${API_BASE}/admin/investments/${id}/approve/`, {
    method: "POST",
    headers: authHeaders(access),
  });

  const { raw, json } = await readBodyOnce(res);

  if (!res.ok) {
    throw new Error(`Falha ao aprovar: ${res.status} ${formatError(res.status, raw, json)}`);
  }

  return json;
}

export async function rejectInvestment(access: string, id: number | string) {
  const res = await fetch(`${API_BASE}/admin/investments/${id}/reject/`, {
    method: "POST",
    headers: authHeaders(access),
  });

  const { raw, json } = await readBodyOnce(res);

  if (!res.ok) {
    throw new Error(`Falha ao rejeitar: ${res.status} ${formatError(res.status, raw, json)}`);
  }

  return json;
}

export type AdminSummary = {
  tvl_approved_cents: number;
  pending_cents: number;
  approved_count: number;
  pending_count: number;
};

export async function getAdminSummary(access: string): Promise<AdminSummary> {
  const res = await fetch(`${API_BASE}/admin/summary/`, {
    headers: authHeaders(access),
  });

  const { raw, json } = await readBodyOnce(res);

  if (!res.ok) {
    throw new Error(`Falha ao carregar admin summary: ${res.status} ${formatError(res.status, raw, json)}`);
  }

  return json as AdminSummary;
}
