import { createHash, createHmac, randomUUID } from 'node:crypto';
import { inc } from './metrics.js';
import { writeCheckpoint, lastCheckpoint, resetCheckpoint } from './checkpoint.js';

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
  // Also record an external, append-only checkpoint so truncation of the most
  // recent entries is detectable even though the hash chain alone can't see it.
  writeCheckpoint({ entryId: entry.eventId, count: entries.length, latestHmac: entry.hmac });
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

// Cross-reference the live log against the append-only checkpoint file. This
// catches TRUNCATION of the most recent entries — which verify() cannot, since
// the surviving chain is still internally consistent. We compare the live entry
// count + latest HMAC against what the checkpoint last recorded.
export function verifyAgainstCheckpoint() {
  const cp = lastCheckpoint();
  if (!cp || cp.count == null) {
    return { status: 'NO_CHECKPOINT', liveCount: entries.length };
  }

  const liveCount = entries.length;
  const liveLatest = liveCount ? entries[liveCount - 1].hmac : '0'.repeat(64);

  // Fewer live entries than the checkpoint last recorded → entries were deleted.
  if (liveCount < cp.count) {
    inc('log_integrity_violations_total');
    return {
      status: 'TRUNCATION_DETECTED',
      expectedCount: cp.count,
      liveCount,
      missing: cp.count - liveCount,
      expectedLatestHmac: cp.latestHmac,
    };
  }

  // Same count but the latest HMAC doesn't match what the checkpoint expected →
  // the tail was rewritten to hide a deletion+re-add. Also a mismatch.
  if (liveCount === cp.count && cp.latestHmac && liveLatest !== cp.latestHmac) {
    inc('log_integrity_violations_total');
    return {
      status: 'TRUNCATION_DETECTED',
      expectedCount: cp.count,
      liveCount,
      missing: 0,
      expectedLatestHmac: cp.latestHmac,
      note: 'latest HMAC does not match checkpoint',
    };
  }

  return { status: 'OK', expectedCount: cp.count, liveCount };
}

// Demo affordance: DELETE the last entry (truncation) without touching the
// checkpoint file — exactly what an attacker with DB write access would do.
// verify() will still report VALID; verifyAgainstCheckpoint() catches it.
export function truncateLast(n = 1) {
  const removed = entries.splice(Math.max(0, entries.length - n), n);
  return { removed: removed.length, remaining: entries.length };
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
  // Start a fresh checkpoint file for a clean demo run. This is the only place
  // the checkpoint is truncated (see checkpoint.js resetCheckpoint), and it is
  // deliberately separate from the append-only write path.
  resetCheckpoint();
}
