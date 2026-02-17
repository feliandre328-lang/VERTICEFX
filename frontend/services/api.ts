const API_BASE = "http://127.0.0.1:8000";

type TokenPair = { access: string; refresh: string };
async function parseError(res: Response) {
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") return data.detail;
    return JSON.stringify(data);
  } catch {
    return await res.text();
  }
}

// -------------------- AUTH--------------------//

function authHeaders(access: string) {
  if (!access) throw new Error("Token ausente. Faça login novamente.");
  return { Authorization: `Bearer ${access}` };
}

export async function login(username: string, password: string) {
  const res = await fetch(`${API_BASE}/api/auth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) throw new Error(`Falha no login: ${res.status} ${await parseError(res)}`);
  return res.json() as Promise<{ access: string; refresh: string }>;
}

export type Me = {
  id: number;
  username: string;
  email: string;
  is_staff: boolean;
  is_superuser: boolean;
};

export async function fetchMe(accessToken: string): Promise<Me> {
  const res = await fetch(`${API_BASE}/api/auth/me/`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Falha ao carregar usuário: ${res.status} ${await parseError(res)}`);
  return res.json();
}

// -------------------- DASHBOARD SUMMARY --------------------//

export type DashboardSummary = {
  balance_capital_cents: number;
  pending_cents: number;
  approved_count: number;
  pending_count: number;
};

export async function getDashboardSummary(access: string): Promise<DashboardSummary> {
  const res = await fetch(`${API_BASE}/api/dashboard/summary/`, {
    headers: { Authorization: `Bearer ${access}` },
  });

  if (!res.ok) throw new Error(`Falha ao carregar resumo: ${res.status} ${await parseError(res)}`);
  return await res.json();
}

// -------------------- PIX --------------------//

export async function createPixCharge(access: string, amount: number) {
  const res = await fetch(`${API_BASE}/api/pix/charge/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access}`,
    },
    body: JSON.stringify({ amount }),
  });

  if (!res.ok) throw new Error(`Falha ao gerar Pix: ${res.status} ${await parseError(res)}`);
  return res.json() as Promise<{ pix_code: string; external_ref: string }>;
}

// --------------------INVESTMENT--------------------//

export async function createInvestment(
  access: string,
  data: { amount: number; external_ref?: string; paid_at?: string }
) {
  const res = await fetch(`${API_BASE}/api/investments/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error(`Falha ao registrar aporte: ${res.status} ${await parseError(res)}`);
  return res.json();
}

export async function listInvestments(access: string) {
  const res = await fetch(`${API_BASE}/api/investments/`, {
    headers: { Authorization: `Bearer ${access}` },
  });

  if (!res.ok) throw new Error(`Falha ao listar aportes: ${res.status} ${await parseError(res)}`);
  return res.json();
}

export type InvestmentItem = {
  id: number | string;
  amount_cents: number;
  amount?: number; // se o serializer mandar
  status: "PENDING" | "APPROVED" | "REJECTED" | string;
  paid_at: string | null;
  external_ref: string | null;
  created_at: string;
};

// -------------------- SUMMARY --------------------//

export async function getMeSummary(access: string) {
  const res = await fetch(`${API_BASE}/api/me/summary/`, {
    headers: { Authorization: `Bearer ${access}` },
  });

  if (!res.ok) {
    throw new Error(`Falha ao buscar resumo: ${res.status} ${await parseError(res)}`);
  }

  return res.json() as Promise<{
    total_invested: number;
    count_investments: number;
  }>;
}

// --------------------------------- ADMIN -----------------------//

export async function listAdminInvestments(access: string, status?: string) {
  const url = new URL("http://127.0.0.1:8000/api/admin/investments/");
  if (status) url.searchParams.set("status", status);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${access}` },
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Falha ao listar admin investments: ${res.status} ${txt}`);
  }
  return res.json();
}

export async function approveInvestment(access: string, id: number | string) {
  const res = await fetch(`http://127.0.0.1:8000/api/admin/investments/${id}/approve/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${access}` },
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Falha ao aprovar: ${res.status} ${txt}`);
  }
  return res.json();
}

export async function rejectInvestment(access: string, id: number | string) {
  const res = await fetch(`http://127.0.0.1:8000/api/admin/investments/${id}/reject/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${access}` },
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Falha ao rejeitar: ${res.status} ${txt}`);
  }
  return res.json();
}