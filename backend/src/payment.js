import { randomUUID, createHash } from 'node:crypto';
import { evaluate } from './decisionEngine.js';
import { appendEvent } from './auditLog.js';
import { gateway } from './gateway/index.js';
import { inc } from './metrics.js';

// ---------------------------------------------------------------------------
// PAYMENT SERVICE — the guarded handoff from CAPITA to the payment gateway.
//
// SECURITY RULE:  LLM → CAPITA → ALLOW → user confirmation → gateway.
// NEVER:          LLM → gateway.
//
// The client cannot simply say "pay this". Every payment call RE-RUNS the
// deterministic decision engine on the submitted document server-side. The
// gateway is only ever invoked when that re-validation independently returns
// `execute`. A refused/escalated document — or any attempt to pay an amount
// the document doesn't ground — is rejected here, before the gateway is touched.
// ---------------------------------------------------------------------------

const MERCHANTS = {
  invoice: 'Verified Vendor (invoice)',
  email: 'Verified Vendor (email)',
  memo: 'Internal Transfer',
  document: 'Verified Counterparty',
};

// In-memory pending checkouts (a real system would persist these).
const checkouts = new Map();

function sha256(s) {
  return createHash('sha256').update(s).digest('hex');
}

// Re-validate the document and return the CAPITA decision + the amount the
// engine actually authorized. This is the single source of truth.
function revalidate(input) {
  const result = evaluate(input);
  return { result, decision: result.decision, amount: result.actionableAmount };
}

// STEP 1 — checkout: only succeeds if re-validation returns `execute`.
// Returns a verified summary the UI renders. No money moves yet.
export function createCheckout(input) {
  const { result, decision, amount } = revalidate(input);

  if (decision !== 'execute') {
    inc('payments_blocked_total');
    appendEvent({
      event: 'PAYMENT_BLOCKED',
      actor: 'payment-service',
      action: `Checkout refused — CAPITA decision was ${decision.toUpperCase()}`,
      payload: { decision, source: input.filename || input.type },
    });
    return {
      ok: false,
      reason: 'not_authorized',
      decision,
      message: `Payment refused: CAPITA returned ${decision.toUpperCase()}, not ALLOW. Only validated actions can reach the gateway.`,
    };
  }

  if (amount == null || amount <= 0) {
    return { ok: false, reason: 'no_amount', decision, message: 'No grounded payable amount to charge.' };
  }

  const checkoutId = randomUUID();
  const invoiceId = input.filename || `${input.type}-${checkoutId.slice(0, 6)}`;
  const summary = {
    checkoutId,
    merchant: MERCHANTS[input.type] || MERCHANTS.document,
    amount,
    currency: 'INR',
    invoiceId,
    // A digest of the validated action, so confirm() can bind to this exact checkout.
    actionDigest: sha256(JSON.stringify({ amount, invoiceId, decision })),
    createdAt: new Date().toISOString(),
  };

  // Store the *validated* action — not the raw document — for the confirm step.
  checkouts.set(checkoutId, { input, amount, invoiceId, decision, summary });

  appendEvent({
    event: 'PAYMENT_INITIATED',
    actor: 'payment-service',
    action: `Checkout for ₹${amount.toLocaleString('en-IN')} · ${invoiceId}`,
    payload: { checkoutId, amount, invoiceId },
  });

  return { ok: true, decision, checkout: summary };
}

// STEP 2 — confirm: requires explicit user confirmation. RE-VALIDATES AGAIN so
// the decision can't have drifted, then calls the gateway. Supports simulated
// success / failure / cancel outcomes for the demo.
export async function confirmPayment({ checkoutId, confirmed, simulate }) {
  const pending = checkouts.get(checkoutId);
  if (!pending) return { ok: false, reason: 'unknown_checkout', message: 'Checkout not found or expired.' };

  if (!confirmed) {
    return { ok: false, reason: 'confirmation_required', message: 'Explicit user confirmation is required before payment.' };
  }

  // Cancelled by the user — never touches the gateway.
  if (simulate === 'cancel') {
    checkouts.delete(checkoutId);
    appendEvent({
      event: 'PAYMENT_CANCELLED',
      actor: 'user',
      action: `Payment cancelled · ${pending.invoiceId}`,
      payload: { checkoutId },
    });
    return { ok: true, state: 'CANCELLED', message: 'Payment cancelled by the user. No charge attempted.' };
  }

  // DEFENSE-IN-DEPTH: re-validate the document one more time at confirm.
  const { decision, amount } = revalidate(pending.input);
  if (decision !== 'execute' || amount == null || amount <= 0) {
    inc('payments_blocked_total');
    appendEvent({
      event: 'PAYMENT_BLOCKED',
      actor: 'payment-service',
      action: `Confirm refused — re-validation returned ${decision.toUpperCase()}`,
      payload: { checkoutId, decision },
    });
    return { ok: false, reason: 'revalidation_failed', decision, message: 'Re-validation failed at confirmation; payment aborted.' };
  }

  // Hand the VALIDATED ACTION (never the document/LLM output) to the gateway.
  const validatedAction = {
    amount,
    currency: 'INR',
    merchant: pending.summary.merchant,
    invoiceId: pending.invoiceId,
    idempotencyKey: checkoutId,
    simulate,
  };

  const settlement = await gateway.charge(validatedAction);
  checkouts.delete(checkoutId);

  const txnId = `TXN-${randomUUID().slice(0, 8).toUpperCase()}`;
  const success = settlement.status === 'success';
  inc(success ? 'payments_succeeded_total' : 'payments_failed_total');

  const audit = appendEvent({
    event: success ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED',
    actor: 'payment-gateway',
    action: `${success ? 'Paid' : 'Failed'} ₹${amount.toLocaleString('en-IN')} · ${txnId}`,
    payload: { txnId, amount, invoiceId: pending.invoiceId, providerRef: settlement.providerRef, gateway: gateway.name() },
  });

  return {
    ok: true,
    state: success ? 'SUCCESS' : 'FAILED',
    receipt: {
      txnId,
      amount,
      currency: 'INR',
      merchant: pending.summary.merchant,
      invoiceId: pending.invoiceId,
      providerRef: settlement.providerRef,
      gateway: gateway.name(),
      message: settlement.message,
      timestamp: audit.timestamp,
      auditHash: audit.hmac ? audit.hmac.slice(0, 24) + '…' : null,
    },
  };
}
