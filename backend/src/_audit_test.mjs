// Audit-log self-tests (Node port of tests/test_audit_chain.py).
// Run: node src/_audit_test.mjs   (or: npm run test:audit)
//
// Verifies: clean chain valid, edit cascades, insertion detected, last-entry
// edit only breaks last, AND the truncation gap is now closed by the
// append-only checkpoint (the two required new tests).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  reset,
  appendEvent,
  list,
  verify,
  verifyAgainstCheckpoint,
  tamper,
  truncateLast,
} from './auditLog.js';

let pass = 0;
let fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  PASS', name); }
  else { fail++; console.log('  FAIL', name); }
}

function buildSampleChain() {
  reset();
  appendEvent({ event: 'DOCUMENT_UPLOADED', actor: 'user', action: 'invoice_1.pdf' });
  appendEvent({ event: 'DECISION_EXECUTE', actor: 'assistant', action: 'payment 10000' });
  appendEvent({ event: 'DOCUMENT_UPLOADED', actor: 'user', action: 'invoice_2.pdf' });
  appendEvent({ event: 'DECISION_REFUSE', actor: 'assistant', action: 'untrusted instruction' });
  appendEvent({ event: 'DECISION_ESCALATE', actor: 'assistant', action: 'payment 500000' });
}

console.log('Audit chain + checkpoint self-test\n');

// 1. Clean chain fully valid.
buildSampleChain();
check('clean chain fully valid', verify().intact === true);

// 2. Tamper middle entry cascades from that point.
buildSampleChain();
tamper(2, { action: 'hacked' }); // 0-indexed entry #2 == "invoice_2.pdf"
{
  const v = verify();
  check('middle tamper is detected (chain broken)', v.intact === false && v.brokenAt === 2);
}

// 3. Tamper last entry: chain broken only from the last (still detected).
buildSampleChain();
tamper(4, { action: 'hacked' });
check('last-entry edit is detected', verify().intact === false && verify().brokenAt === 4);

// 4. THE GAP: truncating the last entry is NOT caught by hash verification.
buildSampleChain();
truncateLast(1); // delete the last entry, leaving the chain internally consistent
check('confirms hash-chain alone still reports VALID after truncation (expected)', verify().intact === true);

// 5. THE FIX: the checkpoint catches the truncation hash verification missed.
{
  const cp = verifyAgainstCheckpoint();
  check('checkpoint detects truncation (TRUNCATION_DETECTED)', cp.status === 'TRUNCATION_DETECTED');
  check('checkpoint reports 1 entry missing', cp.missing === 1);
}

// 6. After a clean rebuild, checkpoint says OK.
buildSampleChain();
check('checkpoint OK on an intact, matching chain', verifyAgainstCheckpoint().status === 'OK');

// 7. The checkpoint file must never be opened in write/truncate mode on the
//    normal write path. Scan the source for a 'w'-mode open on the checkpoint.
{
  const srcDir = dirname(fileURLToPath(import.meta.url));
  const offenders = [];
  const files = collectJs(srcDir);
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    // Look for write/truncate opens that reference the checkpoint.
    const lines = text.split('\n');
    lines.forEach((ln, i) => {
      const isCheckpointCtx = /checkpoint/i.test(ln);
      const isWriteOpen =
        /appendFileSync\([^)]*flag:\s*['"]w['"]/.test(ln) ||
        /writeFileSync\([^)]*checkpoint/i.test(ln) ||
        (/openSync\([^)]*['"]w['"]/.test(ln) && isCheckpointCtx);
      // Allowed exception: the explicitly-named resetCheckpoint() demo helper.
      const inResetHelper = /resetCheckpoint|reset the checkpoint|only place the file is truncated/i.test(text.slice(Math.max(0, text.indexOf(ln) - 400), text.indexOf(ln)));
      if (isWriteOpen && !inResetHelper) offenders.push(`${f}:${i + 1}: ${ln.trim()}`);
    });
  }
  check('checkpoint file not opened in write mode on the write path', offenders.length === 0);
  if (offenders.length) offenders.forEach((o) => console.log('     offender:', o));
}

function collectJs(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...collectJs(p));
    else if (name.endsWith('.js')) out.push(p);
  }
  return out;
}

console.log(`\n${pass} passed, ${fail} failed`);
// Clean up so we don't leave a tampered/truncated state around.
reset();
process.exit(fail === 0 ? 0 : 1);
