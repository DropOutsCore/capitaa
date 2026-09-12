// Thin client for the real Capita backend.
// - In dev, VITE_API_BASE is empty and Vite proxies /api, /healthz, /metrics
//   to the Express server (see vite.config.js).
// - In production (e.g. Render/Vercel static hosting) there is no proxy, so set
//   VITE_API_BASE to the deployed API origin, e.g.
//     VITE_API_BASE=https://capitaa-backend.onrender.com
//   Vite inlines this at BUILD time, so change it and rebuild the frontend.
// A trailing slash is trimmed so `${BASE}/api/...` never doubles up.
const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');

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

  reportLanguages: () => request('/api/report/languages'),
  generateReport: (payload) =>
    request('/api/report', { method: 'POST', body: JSON.stringify(payload) }),

  shareProof: (payload) =>
    request('/api/proof/share', { method: 'POST', body: JSON.stringify(payload) }),
  getSharedProof: (id) => request(`/api/proof/shared/${id}`),
  verifySharedProof: (id) => request(`/api/proof/verify-shared/${id}`, { method: 'POST' }),

  paymentCheckout: (payload) =>
    request('/api/payment/checkout', { method: 'POST', body: JSON.stringify(payload) }),
  paymentConfirm: (payload) =>
    request('/api/payment/confirm', { method: 'POST', body: JSON.stringify(payload) }),
};
