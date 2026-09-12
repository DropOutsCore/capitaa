import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { generate, verify } from '../crypto/predicateProof.js';
import { appendEvent } from '../auditLog.js';
import { inc } from '../metrics.js';

export const proofRouter = Router();

const MAX_BITS = 64;

// In-memory store of SHARED proofs. Keyed by proofId. We deliberately store
// ONLY the public artifact (claim, commitment, threshold, nBits, proof) plus
// metadata — never the private value or blinding randomness (they aren't even
// available here; /generate never returns them).
const sharedProofs = new Map();
const DEFAULT_TTL_MS = Number(process.env.PROOF_SHARE_TTL_MS) || 24 * 60 * 60 * 1000; // 24h

// POST /api/proof/generate — prove value >= threshold without revealing value.
const GenSchema = z.object({
  value: z.number().int().nonnegative(),
  threshold: z.number().int().nonnegative(),
  nBits: z.number().int().min(8).max(MAX_BITS).optional(),
});

proofRouter.post('/generate', (req, res) => {
  const parsed = GenSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: 'validation_error', issues: parsed.error.issues });
  }
  const { value, threshold, nBits } = parsed.data;
  const out = generate(value, threshold, nBits);
  inc('proofs_generated_total');
  // Audit the proof generation — commits to the public inputs only, never the
  // private value (which is not in `out` either).
  appendEvent({
    event: 'PROOF_GENERATED',
    actor: 'proof-service',
    action: `Predicate proof for ${out.predicate}`,
    payload: { predicate: out.predicate, satisfied: out.satisfied, commitment: out.commitment },
  });
  // The response deliberately excludes the private value + randomness.
  res.json(out);
});

// POST /api/proof/verify — verify a proof against a public commitment+threshold.
const VerifySchema = z.object({
  commitment: z.string().min(1),
  threshold: z.union([z.string(), z.number()]),
  nBits: z.number().int().min(8).max(MAX_BITS).optional(),
  proof: z.any().nullable(),
});

proofRouter.post('/verify', (req, res) => {
  const parsed = VerifySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: 'validation_error', issues: parsed.error.issues });
  }
  const { commitment, threshold, nBits, proof } = parsed.data;
  const out = verify({ commitment, threshold: String(threshold), nBits, proof });
  inc('proofs_verified_total');
  res.json(out);
});

// ---------------------------------------------------------------------------
// SHAREABLE PROOF VERIFICATION
//
// A holder who has a valid proof can publish it under a random proof_id. The
// shared record contains ONLY the public claim + commitment + proof + metadata
// — the private balance is never present. Anyone with the link can then have
// the server independently re-verify it.
// ---------------------------------------------------------------------------

// POST /api/proof/share — publish the PUBLIC artifact of an existing proof.
const ShareSchema = z.object({
  claim: z.string().min(1).max(200), // e.g. "Balance ≥ ₹1,00,000"
  commitment: z.string().min(1),
  threshold: z.union([z.string(), z.number()]),
  nBits: z.number().int().min(8).max(MAX_BITS).optional(),
  proof: z.any(), // the public proof object; must NOT contain the value
  ttlMs: z.number().int().positive().max(7 * 24 * 60 * 60 * 1000).optional(),
});

proofRouter.post('/share', (req, res) => {
  const parsed = ShareSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: 'validation_error', issues: parsed.error.issues });
  }
  const { claim, commitment, threshold, nBits, proof, ttlMs } = parsed.data;

  const proofId = randomUUID();
  const now = Date.now();
  const expiresAt = new Date(now + (ttlMs || DEFAULT_TTL_MS)).toISOString();

  // Store ONLY public data. There is no field here that could carry the value.
  sharedProofs.set(proofId, {
    proofId,
    claim,
    commitment: String(commitment),
    threshold: String(threshold),
    nBits: nBits || undefined,
    proof, // public proof object
    createdAt: new Date(now).toISOString(),
    expiresAt,
  });

  appendEvent({
    event: 'PROOF_SHARED',
    actor: 'proof-service',
    action: `Shared proof for ${claim}`,
    payload: { proofId, claim, commitment: String(commitment) },
  });

  res.json({ proofId, claim, expiresAt, verifyPath: `/verify?id=${proofId}` });
});

// Public-safe view of a shared record: never includes the proof internals in a
// way that could be misread as the value — but the value is not present anyway.
function publicView(rec) {
  return {
    proofId: rec.proofId,
    claim: rec.claim,
    createdAt: rec.createdAt,
    expiresAt: rec.expiresAt,
    expired: Date.now() > new Date(rec.expiresAt).getTime(),
  };
}

// GET /api/proof/shared/:id — metadata about a shared proof (for the page header).
proofRouter.get('/shared/:id', (req, res) => {
  const rec = sharedProofs.get(req.params.id);
  if (!rec) return res.status(404).json({ error: 'not_found' });
  res.json(publicView(rec));
});

// POST /api/proof/verify-shared/:id — independently re-verify the shared proof.
// Returns state Valid | Invalid | Expired. Never exposes the private value.
proofRouter.post('/verify-shared/:id', (req, res) => {
  const rec = sharedProofs.get(req.params.id);
  if (!rec) return res.status(404).json({ error: 'not_found', state: 'NOT_FOUND' });

  const meta = publicView(rec);
  if (meta.expired) {
    return res.json({ state: 'EXPIRED', ...meta });
  }

  const result = verify({ commitment: rec.commitment, threshold: rec.threshold, nBits: rec.nBits, proof: rec.proof });
  inc('proofs_verified_total');

  res.json({
    state: result.valid ? 'VALID' : 'INVALID',
    valid: result.valid,
    verificationMs: result.verificationMs,
    actualBalance: 'Hidden', // explicit: the verifier never learns it
    ...meta,
  });
});

// Demo helper: expire a shared proof immediately (for the Expired-state demo).
proofRouter.post('/expire-shared/:id', (req, res) => {
  const rec = sharedProofs.get(req.params.id);
  if (!rec) return res.status(404).json({ error: 'not_found' });
  rec.expiresAt = new Date(Date.now() - 1000).toISOString();
  res.json(publicView(rec));
});
