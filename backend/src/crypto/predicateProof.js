import { performance } from 'node:perf_hooks';
import { p, g, mod, modpow, modinv, randScalar, commit } from './pedersen.js';
import { proveRange, verifyRange } from './rangeProof.js';

// ---------------------------------------------------------------------------
// Predicate proof:  prove  value >= threshold  without revealing value.
//
// Idea: publish a Pedersen commitment C = g^value h^r. To prove value >= T,
// derive C_w = C * g^{-T} = g^{value-T} h^r and give a zero-knowledge range
// proof that the committed w = value - T is in [0, 2^n). That establishes
// value in [T, T + 2^n) without disclosing value, its exact range, or timing.
//
// The verifier is given only C, T, n and the proof — never value or r.
// ---------------------------------------------------------------------------

const DEFAULT_BITS = 32; // supports predicate margins up to ~4.29e9

const gInvCache = new Map();
function gPow(t) {
  // g^t mod p
  return modpow(g, BigInt(t), p);
}

export function generate(value, threshold, nBits = DEFAULT_BITS) {
  const v = BigInt(value);
  const T = BigInt(threshold);
  const w = v - T;

  const t0 = performance.now();

  // Random commitment to the private value.
  const r = randScalar();
  const C = commit(v, r);

  const satisfiable = w >= 0n && w < 1n << BigInt(nBits);
  let proof = null;
  if (satisfiable) {
    // Range-prove w = value - T in [0, 2^n) using the SAME randomness r,
    // because C_w = C * g^{-T} = g^w h^r.
    proof = proveRange(w, r, nBits);
  }

  const genMs = performance.now() - t0;

  return {
    // public inputs
    commitment: C.toString(),
    threshold: T.toString(),
    nBits,
    predicate: `value >= ${T.toString()}`,
    satisfied: satisfiable,
    proof, // null if the prover could not satisfy the predicate
    generationMs: Number(genMs.toFixed(2)),
    // NOTE: value and r are intentionally NOT returned.
  };
}

export function verify({ commitment, threshold, nBits = DEFAULT_BITS, proof }) {
  const t0 = performance.now();
  let valid = false;
  try {
    if (proof) {
      const C = BigInt(commitment);
      const T = BigInt(threshold);
      // Recompute C_w = C * g^{-T} and check the range proof against it.
      const Cw = mod(C * modinv(gPow(T), p), p);
      valid = verifyRange(Cw, { ...proof, nBits });
    }
  } catch {
    valid = false;
  }
  const verifyMs = performance.now() - t0;
  return { valid, verificationMs: Number(verifyMs.toFixed(2)) };
}
