const API_BASE = "http://127.0.0.1:8000";


async function parseError(res: Response) {
  try {
    const data = await res.json();
    return JSON.stringify(data);
  } catch {
    return await res.text();
  }
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