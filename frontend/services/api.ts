const API_BASE = "";

export async function login(username: string, password: string) {
  const res = await fetch(`${API_BASE}/api/auth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Falha no login: ${res.status} ${text}`);
  }

  return res.json() as Promise<{ access: string; refresh: string }>;
}

export async function listAssets(access: string) {
  const res = await fetch(`${API_BASE}/api/assets/`, {
    headers: { Authorization: `Bearer ${access}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Falha ao listar assets: ${res.status} ${text}`);
  }

  return res.json();
}

export async function createAsset(access: string, data: { symbol: string; name?: string }) {
  const res = await fetch(`${API_BASE}/api/assets/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Falha ao criar asset: ${res.status} ${text}`);
  }

  return res.json();
}
