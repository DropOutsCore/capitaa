import { randomUUID } from 'node:crypto';

// ---------------------------------------------------------------------------
// PAYMENT GATEWAY BOUNDARY
//
// This is the seam between CAPITA's security layer and a payment provider.
// A provider implements `charge(validatedAction)` and returns a settlement
// result. CAPITA only ever hands a provider a *validated action* — an object
// the deterministic engine has already approved (decision === 'execute').
//
// To go live, implement PaymentProvider against a real PSP (Stripe/Razorpay/…)
// and swap the exported `gateway`. Nothing in the CAPITA security layer changes:
// the payment service still re-validates and still only calls charge() on an
// execute decision.
// ---------------------------------------------------------------------------

// The interface a provider must satisfy.
// charge(action) -> { status: 'success'|'failed', providerRef, message }
// where action = { amount, currency, merchant, invoiceId, idempotencyKey }
export class PaymentProvider {
  // eslint-disable-next-line no-unused-vars
  async charge(action) {
    throw new Error('not implemented');
  }
  name() {
    return 'abstract';
  }
}

// A deterministic mock gateway. It moves NO real money. The outcome can be
// steered for the demo via action.simulate ('success' | 'failure' | 'cancel'),
// defaulting to success. `cancel` is surfaced by the service, not charged here.
export class MockGateway extends PaymentProvider {
  name() {
    return 'MockGateway (no real money)';
  }

  async charge(action) {
    // Simulate a little processing latency.
    await new Promise((r) => setTimeout(r, 250));

    if (action.simulate === 'failure') {
      return {
        status: 'failed',
        providerRef: `mock_decl_${randomUUID().slice(0, 8)}`,
        message: 'Payment declined by issuer (simulated).',
      };
    }

    return {
      status: 'success',
      providerRef: `mock_${randomUUID().slice(0, 12)}`,
      message: 'Payment captured (simulated — no real funds moved).',
    };
  }
}

// The active gateway. Replace this single line to go live.
export const gateway = new MockGateway();
