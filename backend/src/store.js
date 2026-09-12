import { randomUUID } from 'node:crypto';

// In-memory record of processed documents. Kept intentionally simple -the
// tamper-evident chain lives in auditLog.js; this is just the request history
// the demo surfaces back to the client.
const processed = [];

export function record(doc) {
  const entry = { id: randomUUID(), createdAt: new Date().toISOString(), ...doc };
  processed.unshift(entry);
  if (processed.length > 500) processed.pop();
  return entry;
}

export function history(limit = 50) {
  return processed.slice(0, limit);
}

export function reset() {
  processed.length = 0;
}
