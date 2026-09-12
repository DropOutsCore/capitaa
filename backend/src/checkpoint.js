import { appendFileSync, readFileSync, existsSync, closeSync, openSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { logger } from './logger.js';

// ---------------------------------------------------------------------------
// APPEND-ONLY EXTERNAL CHECKPOINT
//
// The HMAC hash chain (auditLog.js) makes tampering CASCADE, but it cannot see
// TRUNCATION of the most recent entries: if an attacker deletes the last rows,
// the remaining chain is still internally consistent. To catch that, we keep a
// SEPARATE, append-only file that records — on every commit — the running entry
// count and the latest HMAC. Verification cross-references the live log against
// the last checkpoint line: if the log now has fewer entries (or a latest HMAC
// that doesn't match the checkpoint for that count), truncation is detected.
//
// This file is opened ONLY in append mode ('a') — never 'w'/'r+' anywhere in
// the codebase. On Linux you can additionally harden it with `chattr +a` so the
// filesystem itself forbids rewrites (see README). That is an OS-level control
// this app cannot apply on Windows, so we document its status honestly.
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PATH = join(__dirname, '..', 'data', 'audit_checkpoint.log');

export const checkpointPath = process.env.AUDIT_CHECKPOINT_PATH || DEFAULT_PATH;

// Ensure the parent dir exists (append fails if the folder is missing).
function ensureDir(path) {
  const dir = dirname(path);
  try {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  } catch {
    /* best effort */
  }
}

// Record one checkpoint line. APPEND-ONLY: flag 'a' opens for appending and
// creates the file if absent; it can never truncate or overwrite prior lines.
export function writeCheckpoint({ entryId, count, latestHmac }) {
  ensureDir(checkpointPath);
  const line = `${new Date().toISOString()} entry_id=${entryId} entry_count=${count} latest_hmac=${latestHmac}\n`;
  try {
    appendFileSync(checkpointPath, line, { flag: 'a' });
  } catch (e) {
    logger.warn({ err: e.message }, 'checkpoint append failed');
  }
}

// The last recorded checkpoint line, parsed. null if the file is empty/missing.
export function lastCheckpoint() {
  if (!existsSync(checkpointPath)) return null;
  let raw;
  try {
    raw = readFileSync(checkpointPath, 'utf8');
  } catch {
    return null;
  }
  const lines = raw.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length === 0) return null;
  const last = lines[lines.length - 1];
  const count = Number((last.match(/entry_count=(\d+)/) || [])[1]);
  const latestHmac = (last.match(/latest_hmac=([a-f0-9]+)/) || [])[1] || null;
  const entryId = (last.match(/entry_id=([^\s]+)/) || [])[1] || null;
  return { count: Number.isFinite(count) ? count : null, latestHmac, entryId, raw: last };
}

// Reset the checkpoint file for a fresh demo. This is the ONLY place the file
// is truncated, and it exists solely so the "Reset chain" demo starts clean —
// it is intentionally NOT part of the normal write path. Guarded so it never
// runs in production.
export function resetCheckpoint() {
  if (process.env.NODE_ENV === 'production') return;
  ensureDir(checkpointPath);
  try {
    // Truncate by opening with 'w' ONCE here, then close. Kept isolated and
    // named `resetCheckpoint` so the append-only invariant on the write path
    // (writeCheckpoint) is unambiguous.
    const fd = openSync(checkpointPath, 'w');
    closeSync(fd);
  } catch (e) {
    logger.warn({ err: e.message }, 'checkpoint reset failed');
  }
}
