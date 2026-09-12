// Thin client for the real Capita backend. In dev, Vite proxies these paths
// to the Express server; in prod set VITE_API_BASE to the API origin.
const BASE = import.meta.env.VITE_API_BASE || '';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const message = (data && data.message) || (data && data.error) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  processDocument: (payload) =>
    request('/api/documents', { method: 'POST', body: JSON.stringify(payload) }),
  getLog: () => request('/api/log'),
  tamperLog: (index, action) =>
    request('/api/log/tamper', { method: 'POST', body: JSON.stringify({ index, action }) }),
  truncateLog: () => request('/api/log/truncate', { method: 'POST' }),
  seedLog: () => request('/api/log/seed', { method: 'POST' }),
  getMetrics: () => request('/metrics?format=json'),
  health: () => request('/healthz'),

  // --- FS-2605 features ---
  listAttacks: () => request('/api/attacks'),
  runAttack: (id) => request('/api/attacks/run', { method: 'POST', body: JSON.stringify({ id }) }),

  generateProof: (value, threshold) =>
    request('/api/proof/generate', { method: 'POST', body: JSON.stringify({ value, threshold }) }),
  verifyProof: (payload) =>
    request('/api/proof/verify', { method: 'POST', body: JSON.stringify(payload) }),

  modelsStatus: () => request('/api/models/status'),
  simulateFailure: () => request('/api/models/simulate-failure', { method: 'POST' }),
  resetModels: () => request('/api/models/reset', { method: 'POST' }),

  getBench: () => request('/api/bench'),
};
