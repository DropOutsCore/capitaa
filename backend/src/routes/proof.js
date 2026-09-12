import { Router } from 'express';
import { z } from 'zod';
import { generate, verify } from '../crypto/predicateProof.js';
import { appendEvent } from '../auditLog.js';
import { inc } from '../metrics.js';

export const proofRouter = Router();

const MAX_BITS = 64;

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
