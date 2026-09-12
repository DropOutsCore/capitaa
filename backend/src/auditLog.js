import { createHash, createHmac, randomUUID } from 'node:crypto';
import { inc } from './metrics.js';

// ---------------------------------------------------------------------------
// CAPITA Audit Log — an HMAC-SHA256 hash chain.
//
// Every important action in CAPITA (document uploads, injection detection,
// payment/security decisions, attack simulations, proof generation, tampering
// demos) is recorded as an event. Each event stores:
//
//   eventId       - unique id
//   timestamp     - ISO time it was committed
//   actor         - who/what performed the action
//   action        - what happened (event type + human label)
//   payloadHash   - SHA-256 of the event's payload (the data it commits to)
//   prevHash      - the previous event's HMAC (this is the "chain" link)
//   hmac          - HMAC-SHA256 over all of the above, keyed by a server secret
//
// Why it's secure: because each event's HMAC covers the previous event's HMAC,
// modifying / inserting / deleting / reordering ANY event breaks every link
// after it. verify() walks the chain and detects the break-point.
//
// IMPORTANT: this is tamper-EVIDENT, not tamper-PROOF. An attacker who holds
// the HMAC key could recompute the whole chain. The property we provide is
// detection of unauthorized modification by anyone without the key.
// ---------------------------------------------------------------------------

const GENESIS = '0'.repeat(64);

// Server-side HMAC key. In production this lives in a KMS / secret store; for
// the demo it comes from the environment with a dev fallback.
const HMAC_KEY = process.env.AUDIT_HMAC_KEY || 'capita-dev-audit-key-change-me';

const entries = [];

function sha256(s) {
  return createHash('sha256').update(s).digest('hex');
}

// SHA-256 of the event payload (whatever data the event commits to).
function hashPayload(payload) {
  return sha256(JSON.stringify(payload ?? {}));
}

// The HMAC that links this entry into the chain. It covers the identifying
// fields + the payload hash + the previous entry's HMAC.
function computeHmac(entry) {
  const material = JSON.stringify({
    eventId: entry.eventId,
    timestamp: entry.timestamp,
    actor: entry.actor,
    action: entry.action,
    payloadHash: entry.payloadHash,
    prevHash: entry.prevHash,
  });
  return createHmac('sha256', HMAC_KEY).update(material).digest('hex');
}

// Append an event to the chain.
//   event   - event type, e.g. 'DOCUMENT_PROCESSED', 'ATTACK_SIMULATED'
//   actor   - who performed it
//   action  - short human-readable description
//   payload - arbitrary data the event commits to (hashed, not stored raw here)
export function appendEvent({ event, actor, action, payload }) {
  const prevHash = entries.length ? entries[entries.length - 1].hmac : GENESIS;
  const entry = {
    eventId: randomUUID(),
    timestamp: new Date().toISOString(),
    actor: actor || 'system',
    event: event || 'EVENT',
    // `action` shown in the UI combines the event type with the description
    action: action || event || 'event',
    payloadHash: hashPayload(payload),
    prevHash,
  };
  entry.hmac = computeHmac(entry);
  entries.push(entry);
  return entry;
}

// Backwards-compatible helper used by the document pipeline. Maps the old
// {actor, decision, source, action} shape onto an event.
export function append({ actor, decision, source, action }) {
  return appendEvent({
    event: `DECISION_${(decision || 'UNKNOWN').toUpperCase()}`,
    actor,
    action: `${(decision || '').toUpperCase()} · ${action}`,
    payload: { decision, source, action },
  });
}

export function list() {
  return entries.slice();
}

// Walk the chain and confirm every link. Returns the first index where the
// chain is broken, or -1 if the log is intact.
export function verify() {
  let expectedPrev = GENESIS;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const recomputed = computeHmac(e);
    if (e.prevHash !== expectedPrev || e.hmac !== recomputed) {
      inc('log_integrity_violations_total');
      return { intact: false, brokenAt: i, reason: e.prevHash !== expectedPrev ? 'chain link mismatch' : 'HMAC mismatch', entry: e };
    }
    expectedPrev = e.hmac;
  }
  return { intact: true, brokenAt: -1 };
}

// Demo affordance: mutate a committed record in place WITHOUT recomputing its
// HMAC — exactly what an attacker editing the store would do. This is the
// PAYLOAD_TAMPERED demonstration: verify() then detects the break.
export function tamper(index, patch) {
  if (index < 0 || index >= entries.length) return null;
  const e = entries[index];
  // Rewrite the action + payload hash but leave the (now stale) hmac in place.
  if (patch.action != null) e.action = patch.action;
  if (patch.payload != null) e.payloadHash = hashPayload(patch.payload);
  e.tamperedField = patch.action != null ? 'action' : 'payload';
  return e;
}

export function reset() {
  entries.length = 0;
}
