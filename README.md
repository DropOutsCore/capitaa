# Capita

**Deterministic AI financial security.** An AI assistant that treats the language model as an *untrusted* component: it may propose actions, but a deterministic policy engine -not the model -decides whether money moves.

> The model proposes. Policy decides.

This repo contains a premium, production-grade single-page marketing site **and** a real backend that genuinely serves the interactive demo. Nothing on the page is faked JSON -the Live Trust Console posts to the running API and renders the actual decision.

---

## 3-command setup

```bash
git clone <your-repo-url> Capita && cd Capita   # 1. clone
npm run setup                                        # 2. install (root + backend + frontend)
npm run dev                                          # 3. run both servers
```

- **Web:** http://localhost:5173
- **API:** http://localhost:4000

`npm run setup` installs the root tooling plus the `backend/` and `frontend/` dependencies. `npm run dev` starts the Express API and the Vite dev server together (via `concurrently`); Vite proxies `/api`, `/healthz`, and `/metrics` to the API so there are no CORS surprises.

### Optional: seed realistic demo data

With both servers running (or just the API), populate a mix of execute / refuse / escalate decisions and live metrics in a few seconds:

```bash
npm run seed
```

---

## What's inside

```
Capita/
├─ backend/     Express REST API -the real decision engine
└─ frontend/    React + Tailwind + Framer Motion + react-three-fiber
```

### Frontend

- **React + Vite + Tailwind** with a macOS-style glassmorphism design system (frosted panels, soft inner borders, elevation shadows, one accent color on a near-black base).
- **Framer Motion** for scroll-reveal (Intersection Observer under the hood), staggered group entrances, a floating navbar that condenses on scroll, and physics-based easing (custom cubic-beziers, never linear).
- **Scroll-driven parallax** background layers that move slower than the foreground.
- **react-three-fiber** powers a single 3D moment in the hero -a slowly rotating, softly distorted glass polyhedron that tilts toward the cursor. It's code-split into its own chunk so it never blocks first paint.
- **Responsive** and **`prefers-reduced-motion`-aware**: the 3D visual and parallax are replaced with a calm static fallback and heavy animation is disabled for users who ask for it.

### Backend

A clean, RESTful Express API with request validation (`zod`), rate limiting, security headers (`helmet`), and structured logging (`pino`) built in from the start.

| Method | Route | Purpose |
| ------ | ----- | ------- |
| `POST` | `/api/documents` | Submit an untrusted document (invoice / email / memo). Returns the `execute` / `refuse` / `escalate` decision with full reasoning, grounded evidence, timeline, and a committed audit entry. |
| `GET`  | `/api/documents/history` | Recent processing history. |
| `GET`  | `/api/log` | The tamper-evident, hash-chained action log plus a live integrity check. |
| `POST` | `/api/log/tamper` | Demo-only: mutate a committed entry to show the hash chain breaking. |
| `GET`  | `/healthz` | Liveness + audit-chain integrity. |
| `GET`  | `/metrics` | Prometheus text format (or `?format=json`) with domain counters. |

**Domain metrics** exposed at `/metrics`:

- `documents_processed_total`
- `decisions_execute_total`, `decisions_refuse_total`, `decisions_escalate_total`
- `injection_attempts_caught_total`
- `grounding_failures_total`
- `log_integrity_violations_total`

#### The decision engine

Given a document, the engine:

1. **Isolates** the content as untrusted and hashes it.
2. **Detects injection** -instruction-override phrases, role/system-prompt hijacks, urgency-framed payment demands, beneficiary-change requests, credential exfiltration, unverifiable authority claims, plus invisible/zero-width characters and multilingual/code-switched override cues.
3. **Grounds** every currency figure back to a source field with a document hash.
4. **Applies deterministic policy** -untrusted source, injection signals, grounding, an autonomous payment limit (`₹1,00,000` by default), and a confirmation/2FA gate -to produce exactly one outcome: **execute**, **refuse**, or **escalate**.
5. **Commits** the decision to the hash-chained audit log.

Configuration lives in `backend/src/config.js` (port, autonomous limit, rate-limit window, CORS origin, log level) and can be overridden with environment variables.

---

## Configuration

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `PORT` | `4000` | API port |
| `AUTONOMOUS_LIMIT_INR` | `100000` | Payments ≥ this require human escalation |
| `RATE_LIMIT_MAX` | `60` | Requests per minute per IP on `/api` |
| `CORS_ORIGIN` | `*` | Allowed CORS origin |
| `LOG_LEVEL` | `info` | pino log level |
| `VITE_API_BASE` | *(empty)* | Frontend: API origin for production builds |

## Production build

```bash
npm run build        # builds the frontend to frontend/dist
npm start            # runs the API (serve frontend/dist behind your web server / CDN)
```

---

## Design notes

- **Two font families only** -Clash Display for headlines, Inter for body.
- **Glass sparingly** -blur is expensive, so frosted panels are bounded and the parallax uses just a few heavily-blurred layers to keep Lighthouse performance high.
- **No perfect-security claims.** The product's honest position: the blast radius of a compromised model is *bounded* by deterministic controls it cannot override.

---

## FS-2605 features

Five high-priority capabilities layered on top of the base product. Everything below is served by the real backend and is measurable/reproducible.

### 1. The Needle Attack Lab
A reproducible suite of **23 attacks** (15 team-authored) across 12 categories — injection, evasion (invisible text, PDF metadata, homoglyphs), multilingual/code-switched, replay, proof reuse/malleability, log tampering/truncation, recovery social-engineering, and proof-cost DoS. Each attack is executed **live** through the real defenses and reports the full chain: **attack → payload → detection → decision → defense layer → result**.

- `GET /api/attacks` — catalogue (metadata + payload preview)
- `POST /api/attacks/run` `{ id }` — run one attack, get the decision + defending layer

### 2. Grounding & Evidence Inspector
Every financial figure the assistant extracts is traceable to its origin. The Trust Console's inspector shows, per figure: **source document, page, field, extracted value, character offset, document hash, and verification status.**

### 3. Predicate-Proof privacy demo (real zero-knowledge)
Prove `balance ≥ ₹100,000` **without revealing the balance**, its range, or timing. Built on **Pedersen commitments + a bit-decomposition range proof** with Chaum-Pedersen OR-proofs, made non-interactive via Fiat-Shamir.

- `POST /api/proof/generate` `{ value, threshold }` → commitment + proof + **measured** generation latency (the private value is never returned)
- `POST /api/proof/verify` `{ commitment, threshold, nBits, proof }` → `{ valid, verificationMs }`
- Correctness/soundness are tested: `npm run test:proof` (from `/backend`) — verifies true statements, rejects false/tampered/rebound proofs, and confirms the value never leaks.

> Honest scope: 1024-bit MODP parameters are used for interactive latency — a real ZK range-proof demonstration, not a production parameter set. We do not claim production-grade security from these parameters.

### 4. Model failover (real LLM proposer)
The model is an untrusted **proposer**: on every document it produces a *structured proposal* (amount, beneficiary, embedded instructions it noticed — flagged, never obeyed, summary, confidence), which is then treated as untrusted input to the deterministic grounding + policy layers. The model **never** sets the decision.

Routing fails over **Gemini (primary) → Claude (secondary) → local heuristic (fallback)**. `POST /api/models/simulate-failure` knocks out the active provider; grounding, typed actions, deterministic policy, and proof verification stay enforced identically — failover changes *who proposes*, never *what is allowed* (verified: same injection → `REFUSE` on every tier).

- `GET /api/models/status`, `POST /api/models/simulate-failure`, `POST /api/models/reset`
- The Trust Console shows the model's proposal next to the policy decision, making the "model proposes, policy decides" split explicit.

**LLM setup:** copy `backend/.env.example` → `backend/.env` and add `GEMINI_API_KEY` / `ANTHROPIC_API_KEY`. With no keys (or unreachable providers) the system uses the local heuristic proposer and still works — the decision layer never depends on the LLM. `backend/.env` is gitignored; never commit real keys.

### Audit log — HMAC hash chain + truncation detection

The tamper-evident audit log is an **HMAC-SHA256 hash chain** (`backend/src/auditLog.js`). Each event stores `eventId, timestamp, actor, action, payloadHash, prevHash, hmac`, and each HMAC covers the *previous* entry's HMAC — so editing, inserting, or reordering any entry cascades a BROKEN/INVALID status to every entry after it.

**Truncation detection.** Deleting the *newest* entry can't be caught by the chain alone — the surviving entries are still internally consistent. To close that gap, every commit also appends a line to a **separate, append-only checkpoint file** (`backend/src/checkpoint.js`, written with `flag: 'a'` only) recording the running entry count and latest HMAC. `verifyAgainstCheckpoint()` cross-references the live log against the checkpoint's last line; if the log has fewer entries (or a mismatched latest HMAC), it flags `TRUNCATION_DETECTED`. The UI shows this as a distinct "ENTRY COUNT MISMATCH" banner, separate from "HASH CHAIN BROKEN".

- `GET /api/log` returns `integrity` (chain) + `truncationCheck` (checkpoint).
- Demo buttons: **Simulate tampering** (edits an entry → chain breaks), **Simulate truncation** (deletes the last entry → chain stays VALID but the checkpoint catches it), **Reset chain**.
- Tests: `npm run test:audit` (from `/backend`) — proves cascade on edit, and that truncation the chain misses is caught by the checkpoint, and that the checkpoint is never opened in write mode on the write path.

**Append-only hardening (honest status):** the checkpoint is opened only in append mode in code. On Linux you can additionally run `chattr +a backend/data/audit_checkpoint.log` so the filesystem itself forbids rewrites (requires root to unset). This was **not** applied in our dev environment (Windows), and we don't claim it.

> **Where this breaks (declared weakness):** truncation of the most recent entry
> is caught by cross-referencing an append-only external checkpoint against the
> live entry count. This checkpoint is stronger than the hash chain alone but is
> not itself cryptographically tamper-proof — an attacker with write access to
> *both* the primary log *and* the checkpoint file, on the same host, could
> still defeat it. A production version would write checkpoints to a separate
> host or an actual append-only store (a WORM S3 bucket, or a public
> transparency log) rather than co-located local disk.

### 5. Live security forensics
The Trust Console renders the real event timeline for each decision (document received → content isolated → injection detected → grounding checked → decision → **audit entry committed**) alongside the reasoning, evidence, and the committed hash-chain entry. The existing tamper-evident audit log (`/api/log`, `/api/log/tamper`) backs it.

### Benchmark harness (measured, reproducible)
```bash
npm run bench          # from /backend  (writes bench/results.json)
```
Runs the real engine over a labelled dataset + the full attack suite + proof latency sampling, and writes measured results (injection detection rate, false-positive rate, grounding accuracy, attack block rate, proof gen/verify latency, soundness). The site reads these via `GET /api/bench`, so published numbers correspond to actual harness output.

New domain metrics at `/metrics`: `attacks_blocked_total`, `proofs_generated_total`, `proofs_verified_total`, `provider_failovers_total`.
