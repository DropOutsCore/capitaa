// Standalone correctness + soundness checks for the predicate proof.
// Run: node src/crypto/_selftest.js
import { generate, verify } from './predicateProof.js';

let pass = 0;
let fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  PASS', name); }
  else { fail++; console.log('  FAIL', name); }
}

console.log('Predicate proof self-test (value >= threshold, value hidden)\n');

// 1. Honest, satisfying case.
const a = generate(147283, 100000);
check('balance 147283 >= 100000 : proof generated', a.satisfied && a.proof);
const av = verify(a);
check('balance 147283 >= 100000 : verifies TRUE', av.valid === true);
console.log(`     gen=${a.generationMs}ms verify=${av.verificationMs}ms`);

// 2. Boundary equality.
const b = generate(100000, 100000);
check('balance 100000 >= 100000 : verifies TRUE', b.satisfied && verify(b).valid === true);

// 3. Not satisfied -> no proof, verify false.
const c = generate(50000, 100000);
check('balance 50000 >= 100000 : NOT satisfied', c.satisfied === false && c.proof === null);
check('balance 50000 >= 100000 : verifies FALSE', verify(c).valid === false);

// 4. Tampered proof must fail.
const d = generate(147283, 100000);
const tampered = JSON.parse(JSON.stringify(d));
tampered.proof.Cs[0] = (BigInt(tampered.proof.Cs[0]) + 1n).toString();
check('tampered bit commitment : verifies FALSE', verify(tampered).valid === false);

// 5. Threshold binding: proof for T=100000 must not verify against T=120000.
const e = generate(147283, 100000);
const rebind = { ...e, threshold: '120000' };
check('threshold rebinding : verifies FALSE', verify(rebind).valid === false);

// 6. Privacy: the generated artifact must not leak the value or randomness.
const f = generate(999999, 100000);
const serialized = JSON.stringify(f);
check('artifact does not contain the raw value', !serialized.includes('999999'));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
