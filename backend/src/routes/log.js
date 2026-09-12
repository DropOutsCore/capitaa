import { Router } from 'express';
import { z } from 'zod';
import { list, verify, tamper, appendEvent, reset } from '../auditLog.js';

export const logRouter = Router();

// GET /api/log -the full tamper-evident action log plus a live integrity check.
logRouter.get('/', (req, res) => {
  const integrity = verify();
  res.json({ entries: list(), integrity, algorithm: 'HMAC-SHA256 hash chain' });
});

// POST /api/log/seed — populate a realistic set of events so the Audit Log has
// a clean, intact chain to demonstrate (and to reset after the tamper demo).
logRouter.post('/seed', (req, res) => {
  reset();
  const events = [
    { event: 'DOCUMENT_UPLOADED', actor: 'user', action: 'Uploaded invoice_4821.pdf', payload: { file: 'invoice_4821.pdf' } },
    { event: 'DECISION_EXECUTE', actor: 'capita-assistant', action: 'EXECUTE · payment ₹84,500', payload: { amount: 84500 } },
    { event: 'DOCUMENT_UPLOADED', actor: 'user', action: 'Uploaded invoice_5090.pdf', payload: { file: 'invoice_5090.pdf' } },
    { event: 'INJECTION_DETECTED', actor: 'grounding-engine', action: 'Prompt injection detected (3 signals)', payload: { signals: 3 } },
    { event: 'DECISION_REFUSE', actor: 'capita-assistant', action: 'REFUSE · untrusted instruction', payload: { reason: 'injection' } },
    { event: 'ATTACK_SIMULATED', actor: 'attack-lab', action: 'Audit log tampering → DETECTED', payload: { id: 'log-tamper' } },
    { event: 'PROOF_GENERATED', actor: 'proof-service', action: 'Predicate proof for value >= 100000', payload: { predicate: 'value >= 100000' } },
    { event: 'DECISION_ESCALATE', actor: 'capita-assistant', action: 'ESCALATE · payment ₹4,50,000', payload: { amount: 450000 } },
  ];
  events.forEach((e) => appendEvent(e));
  res.json({ entries: list(), integrity: verify(), algorithm: 'HMAC-SHA256 hash chain' });
});

// POST /api/log/tamper -demo-only. Mutate a committed entry in place (without
// recomputing its HMAC) so the UI can show the hash chain breaking — the
// PAYLOAD_TAMPERED demonstration. Never expose this in production.
const TamperSchema = z.object({
  index: z.number().int().nonnegative(),
  action: z.string().min(1).max(200).optional(),
});

logRouter.post('/tamper', (req, res) => {
  const parsed = TamperSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: 'validation_error', issues: parsed.error.issues });
  }
  const newAction = parsed.data.action || 'PAYLOAD_TAMPERED — action altered by attacker';
  const updated = tamper(parsed.data.index, { action: newAction });
  if (!updated) return res.status(404).json({ error: 'entry_not_found' });
  const integrity = verify();
  res.json({ tampered: updated, integrity });
});

// POST /api/log/reset — restore an intact chain (undo the tamper demo).
logRouter.post('/reset', (req, res) => {
  // Re-run the seed-style events would require the seeder; here we just report
  // current integrity so the UI can re-fetch. The frontend re-seeds via /api.
  res.json({ integrity: verify(), entries: list() });
});
