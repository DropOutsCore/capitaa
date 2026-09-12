import { inc } from './metrics.js';

// ---------------------------------------------------------------------------
// Model routing + failover.
//
// The LLM is an untrusted *proposer*. We can route between a primary hosted
// model, a secondary hosted model, and a local fallback. Crucially, whichever
// model is active, the deterministic safety layer (grounding, typed actions,
// policy engine, proof verification) is enforced identically — degradation
// never relaxes a control. This module only tracks which proposer is live.
// ---------------------------------------------------------------------------

const TIERS = ['primary', 'secondary', 'local'];

const LABELS = {
  primary: `Gemini (${process.env.GEMINI_MODEL || 'gemini-flash-latest'})`,
  secondary: `Claude (${process.env.CLAUDE_MODEL || 'claude-3-5-sonnet'})`,
  local: 'Local heuristic fallback',
};

// status per tier: 'online' | 'standby' | 'ready' | 'down'
let state = freshState();

function freshState() {
  return {
    primary: 'online',
    secondary: 'standby',
    local: 'ready',
  };
}

// The active proposer is the first non-down tier in priority order.
function activeTier() {
  for (const t of TIERS) {
    if (state[t] !== 'down') return t;
  }
  return 'local';
}

// The invariant safety controls — always enforced regardless of active model.
const SAFETY_LAYER = [
  { key: 'grounding', label: 'Grounding checks', enforced: true },
  { key: 'typed_actions', label: 'Typed action layer', enforced: true },
  { key: 'policy', label: 'Deterministic refusal policy', enforced: true },
  { key: 'proofs', label: 'Proof verification', enforced: true },
];

export function status() {
  const active = activeTier();
  return {
    tiers: TIERS.map((t) => ({
      tier: t,
      label: LABELS[t],
      status: t === active ? 'active' : state[t],
      active: t === active,
    })),
    active,
    activeLabel: LABELS[active],
    safetyLayer: SAFETY_LAYER,
    degraded: active !== 'primary',
  };
}

// Simulate the next provider failure: knock down the current active tier so
// routing falls through to the next one.
export function simulateFailure() {
  const active = activeTier();
  state[active] = 'down';
  // Promote the next available tier to a live-ish status for display.
  const next = activeTier();
  if (state[next] === 'standby' || state[next] === 'ready') {
    // keep its readiness label; status() will render it 'active'
  }
  inc('provider_failovers_total');
  return { failed: active, ...status() };
}

export function reset() {
  state = freshState();
  return status();
}

export function activeModelLabel() {
  return LABELS[activeTier()];
}

// The proposer consults this to skip tiers knocked down by simulate-failure.
export function isTierDown(tier) {
  return state[tier] === 'down';
}
