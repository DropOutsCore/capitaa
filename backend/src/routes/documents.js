import { Router } from 'express';
import { z } from 'zod';
import { evaluate } from '../decisionEngine.js';
import { append } from '../auditLog.js';
import { inc } from '../metrics.js';
import { record, history } from '../store.js';
import { propose } from '../llm/proposer.js';
import { logger } from '../logger.js';

export const documentsRouter = Router();

const DocumentSchema = z.object({
  type: z.enum(['invoice', 'email', 'memo', 'document']).default('document'),
  text: z.string().min(1, 'text is required').max(20000, 'text too large'),
  filename: z.string().max(200).optional(),
  requestedAmount: z.number().nonnegative().optional(),
  confirmed: z.boolean().optional().default(false),
});

// POST /api/documents -submit an untrusted document for the assistant to
// process. Returns the deterministic decision with full reasoning + grounding.
documentsRouter.post('/', async (req, res) => {
  const parsed = DocumentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      error: 'validation_error',
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  const input = parsed.data;

  // STEP 1: the untrusted model PROPOSES (Gemini → Claude → local fallover).
  // Its structured output is untrusted input to the deterministic layers below.
  const { proposal, proposer, tier, latencyMs, errors } = await propose(input.text, input.type);

  // STEP 2: deterministic grounding + policy DECIDE. The proposal never sets
  // the decision — only decisionEngine does, from the raw document + rules.
  const result = evaluate(input);

  // Domain metrics.
  inc('documents_processed_total');
  inc(`decisions_${result.decision}_total`);
  if (result.injectionFindings.length) inc('injection_attempts_caught_total');
  if (input.requestedAmount != null && result.reasoning.some((r) => r.code === 'GRD' && !r.pass)) {
    inc('grounding_failures_total');
  }

  // Commit a tamper-evident audit entry for the decision.
  const audit = append({
    actor: 'Capita-assistant',
    decision: result.decision.toUpperCase(),
    source: input.filename || `${input.type}_document`,
    action:
      result.actionableAmount != null
        ? `payment ₹${result.actionableAmount.toLocaleString('en-IN')}`
        : 'no monetary action',
  });

  record({ type: input.type, decision: result.decision, auditId: audit.id });

  logger.info(
    { decision: result.decision, proposer: tier, injections: result.injectionFindings.length, auditId: audit.id },
    'document processed'
  );

  res.json({
    ...result,
    auditEntry: audit,
    modelUsed: proposer,
    proposerTier: tier,
    proposerLatencyMs: latencyMs,
    proposerErrors: errors,
    // The untrusted model's proposal — shown for transparency, never trusted.
    proposal,
  });
});

// GET /api/documents/history -recent processing history (non-authoritative).
documentsRouter.get('/history', (req, res) => {
  res.json({ items: history(50) });
});
