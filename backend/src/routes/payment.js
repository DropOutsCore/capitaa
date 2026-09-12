import { Router } from 'express';
import { z } from 'zod';
import { createCheckout, confirmPayment } from '../payment.js';
import { logger } from '../logger.js';

export const paymentRouter = Router();

// The document fields the checkout re-validates. Identical shape to /documents —
// because the server RE-RUNS the real decision engine; it never trusts a
// client-asserted "this was allowed".
const CheckoutSchema = z.object({
  type: z.enum(['invoice', 'email', 'memo', 'document']).default('document'),
  text: z.string().min(1).max(20000),
  filename: z.string().max(200).optional(),
  requestedAmount: z.number().nonnegative().optional(),
  confirmed: z.boolean().optional().default(false),
});

// POST /api/payment/checkout — only returns a checkout if CAPITA independently
// re-validates the document to `execute`. Otherwise 403.
paymentRouter.post('/checkout', (req, res) => {
  const parsed = CheckoutSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: 'validation_error', issues: parsed.error.issues });
  }
  const out = createCheckout(parsed.data);
  if (!out.ok) {
    logger.warn({ decision: out.decision, reason: out.reason }, 'checkout refused');
    return res.status(403).json(out);
  }
  res.json(out);
});

// POST /api/payment/confirm — requires explicit confirmation, re-validates
// again, then calls the mock gateway. simulate ∈ success | failure | cancel.
const ConfirmSchema = z.object({
  checkoutId: z.string().uuid(),
  confirmed: z.boolean(),
  simulate: z.enum(['success', 'failure', 'cancel']).default('success'),
});

paymentRouter.post('/confirm', async (req, res) => {
  const parsed = ConfirmSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: 'validation_error', issues: parsed.error.issues });
  }
  const out = await confirmPayment(parsed.data);
  if (!out.ok) return res.status(400).json(out);
  logger.info({ state: out.state, txnId: out.receipt?.txnId }, 'payment confirmed');
  res.json(out);
});
