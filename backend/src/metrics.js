// Domain-specific counters. These are the numbers the landing page's
// "Live Security Telemetry" reads from, and they map to real events emitted
// by the decision engine -not decoration.
const counters = {
  documents_processed_total: 0,
  decisions_execute_total: 0,
  decisions_refuse_total: 0,
  decisions_escalate_total: 0,
  injection_attempts_caught_total: 0,
  grounding_failures_total: 0,
  log_integrity_violations_total: 0,
  attacks_blocked_total: 0,
  proofs_generated_total: 0,
  proofs_verified_total: 0,
  provider_failovers_total: 0,
  payments_succeeded_total: 0,
  payments_failed_total: 0,
  payments_blocked_total: 0,
};

const startedAt = Date.now();

export function inc(name, by = 1) {
  if (counters[name] === undefined) counters[name] = 0;
  counters[name] += by;
}

export function snapshot() {
  return {
    ...counters,
    uptime_seconds: Math.floor((Date.now() - startedAt) / 1000),
  };
}

// Prometheus text exposition format so /metrics is scrapeable by real tooling.
export function prometheus() {
  const lines = [];
  const snap = snapshot();
  for (const [key, value] of Object.entries(snap)) {
    const type = key.endsWith('_total') ? 'counter' : 'gauge';
    lines.push(`# TYPE Capita_${key} ${type}`);
    lines.push(`Capita_${key} ${value}`);
  }
  return lines.join('\n') + '\n';
}
