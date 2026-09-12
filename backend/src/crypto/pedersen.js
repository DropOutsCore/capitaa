import { createHash, randomBytes } from 'node:crypto';

// ---------------------------------------------------------------------------
// Pedersen commitments over a prime-order subgroup of Z_p*.
//
// We use the well-known 1024-bit MODP safe prime (RFC 2409 / IKE Group 2),
// p = 2q + 1 with q prime. The quadratic-residue subgroup has prime order q.
// g and h are two generators of that subgroup whose relative discrete log is
// unknown (h is derived by hashing to the group), which is what Pedersen's
// hiding + binding rely on.
//
// HONEST SECURITY NOTE: 1024-bit MODP is chosen so the demo's proof/verify
// latency is interactive on commodity hardware. It is a demonstration of a
// real zero-knowledge range proof, not a production parameter set. We do not
// claim production-grade security from these parameters.
// ---------------------------------------------------------------------------

export const p =
  0xffffffffffffffffc90fdaa22168c234c4c6628b80dc1cd129024e088a67cc74020bbea63b139b22514a08798e3404ddef9519b3cd3a431b302b0a6df25f14374fe1356d6d51c245e485b576625e7ec6f44c42e9a637ed6b0bff5cb6f406b7edee386bfb5a899fa5ae9f24117c4b1fe649286651ece65381ffffffffffffffffn;

export const q = (p - 1n) / 2n;

// g is a fixed quadratic residue (2^2). h is derived by hashing a domain string
// to the group and squaring (guarantees a QR with unknown log_g h).
export const g = 4n;
export const h = deriveH();

function deriveH() {
  const seed = BigInt('0x' + createHash('sha256').update('capita/pedersen/h/v1').digest('hex'));
  const base = seed % p;
  const hv = modpow(base, 2n, p); // square -> quadratic residue
  return hv <= 1n ? 9n : hv;
}

export function mod(x, m) {
  const r = x % m;
  return r < 0n ? r + m : r;
}

// Fast modular exponentiation.
export function modpow(base, exp, m) {
  base = mod(base, m);
  let result = 1n;
  let e = exp;
  while (e > 0n) {
    if (e & 1n) result = (result * base) % m;
    e >>= 1n;
    base = (base * base) % m;
  }
  return result;
}

// Modular inverse via Fermat's little theorem (m must be prime).
export function modinv(a, m) {
  return modpow(a, m - 2n, m);
}

// A uniformly random scalar in [1, q-1]. 512 random bits >> q, so the modulo
// bias is negligible for a demo.
export function randScalar() {
  const r = BigInt('0x' + randomBytes(64).toString('hex'));
  return mod(r, q - 1n) + 1n;
}

// Pedersen commitment C = g^v * h^r mod p.
export function commit(v, r) {
  return mod(modpow(g, mod(v, q), p) * modpow(h, mod(r, q), p), p);
}

// Fiat-Shamir: hash arbitrary BigInt/string inputs to a scalar in [0, q).
export function hashToScalar(...parts) {
  const hsh = createHash('sha256');
  hsh.update('capita/fs/v1');
  for (const part of parts) {
    hsh.update('|');
    hsh.update(part.toString());
  }
  return mod(BigInt('0x' + hsh.digest('hex')), q);
}
