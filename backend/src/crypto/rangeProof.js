import { p, q, g, h, mod, modpow, modinv, randScalar, commit, hashToScalar } from './pedersen.js';

// ---------------------------------------------------------------------------
// Zero-knowledge range proof that a Pedersen-committed value lies in [0, 2^n).
//
// Technique (all standard, textbook building blocks):
//   1. Commit to each bit b_i of the value:  C_i = g^{b_i} h^{r_i}
//   2. Prove each C_i commits to 0 OR 1 with a Chaum-Pedersen OR proof
//      (a disjunction of two Schnorr proofs of knowledge of log_h), made
//      non-interactive with Fiat-Shamir.
//   3. The verifier checks  prod_i C_i^{2^i} == C, tying the bits to C.
//
// This reveals nothing about the value beyond "it is in [0, 2^n)".
// ---------------------------------------------------------------------------

const gInv = modinv(g, p);

// --- Chaum-Pedersen OR proof: C commits to 0 or 1 (base h, knowledge of r) ---
// Statement: know r s.t. Y0 = h^r (bit 0)  OR  Y1 = h^r where Y1 = C * g^{-1}.
function proveBit(bit, C, r) {
  const Y0 = C; // if bit==0, C = h^r
  const Y1 = mod(C * gInv, p); // if bit==1, C*g^-1 = h^r

  // Simulated (fake) branch values + real branch commitment.
  let t0, t1, e0, e1, s0, s1;

  if (bit === 0) {
    // Real branch = 0. Simulate branch 1.
    const k = randScalar();
    t0 = modpow(h, k, p);
    e1 = randScalar();
    s1 = randScalar();
    // t1 = h^{s1} * Y1^{-e1}
    t1 = mod(modpow(h, s1, p) * modinv(modpow(Y1, e1, p), p), p);
    const e = hashToScalar('bit', C, t0, t1);
    e0 = mod(e - e1, q);
    s0 = mod(k + e0 * r, q);
  } else {
    // Real branch = 1. Simulate branch 0.
    const k = randScalar();
    t1 = modpow(h, k, p);
    e0 = randScalar();
    s0 = randScalar();
    // t0 = h^{s0} * Y0^{-e0}
    t0 = mod(modpow(h, s0, p) * modinv(modpow(Y0, e0, p), p), p);
    const e = hashToScalar('bit', C, t0, t1);
    e1 = mod(e - e0, q);
    s1 = mod(k + e1 * r, q);
  }

  return {
    t0: t0.toString(),
    t1: t1.toString(),
    e0: e0.toString(),
    e1: e1.toString(),
    s0: s0.toString(),
    s1: s1.toString(),
  };
}

function verifyBit(C, proof) {
  const t0 = BigInt(proof.t0);
  const t1 = BigInt(proof.t1);
  const e0 = BigInt(proof.e0);
  const e1 = BigInt(proof.e1);
  const s0 = BigInt(proof.s0);
  const s1 = BigInt(proof.s1);

  const Y0 = C;
  const Y1 = mod(C * gInv, p);

  // Challenge must split correctly.
  const e = hashToScalar('bit', C, t0, t1);
  if (mod(e0 + e1, q) !== e) return false;

  // h^{s0} == t0 * Y0^{e0}   and   h^{s1} == t1 * Y1^{e1}
  const lhs0 = modpow(h, s0, p);
  const rhs0 = mod(t0 * modpow(Y0, e0, p), p);
  if (lhs0 !== rhs0) return false;

  const lhs1 = modpow(h, s1, p);
  const rhs1 = mod(t1 * modpow(Y1, e1, p), p);
  if (lhs1 !== rhs1) return false;

  return true;
}

// --- Range proof over a value with known commitment randomness r ---
export function proveRange(value, r, nBits) {
  if (value < 0n || value >= 1n << BigInt(nBits)) {
    throw new Error('value out of range for proof');
  }

  const ris = [];
  let acc = 0n; // sum r_i * 2^i for i < nBits-1
  for (let i = 0; i < nBits - 1; i++) {
    const ri = randScalar();
    ris.push(ri);
    acc = mod(acc + ri * (1n << BigInt(i)), q);
  }
  // Choose the last r so that sum r_i 2^i == r (mod q), tying bits to C.
  const invTop = modinv(mod(1n << BigInt(nBits - 1), q), q);
  const rLast = mod((r - acc) * invTop, q);
  ris.push(rLast);

  const Cs = [];
  const bitProofs = [];
  for (let i = 0; i < nBits; i++) {
    const bit = Number((value >> BigInt(i)) & 1n);
    const Ci = commit(BigInt(bit), ris[i]);
    Cs.push(Ci.toString());
    bitProofs.push(proveBit(bit, Ci, ris[i]));
  }

  return { nBits, Cs, bitProofs };
}

export function verifyRange(C, proof) {
  const { nBits, Cs, bitProofs } = proof;
  if (!Array.isArray(Cs) || !Array.isArray(bitProofs) || Cs.length !== nBits || bitProofs.length !== nBits) {
    return false;
  }

  // 1. Each bit commitment is to 0 or 1.
  for (let i = 0; i < nBits; i++) {
    const Ci = BigInt(Cs[i]);
    if (!verifyBit(Ci, bitProofs[i])) return false;
  }

  // 2. The bits reconstruct C:  prod C_i^{2^i} == C.
  let recon = 1n;
  for (let i = 0; i < nBits; i++) {
    const Ci = BigInt(Cs[i]);
    recon = mod(recon * modpow(Ci, 1n << BigInt(i), p), p);
  }
  return recon === mod(C, p);
}
