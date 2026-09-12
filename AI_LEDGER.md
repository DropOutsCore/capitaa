# AI Ledger — CAPITA

A transparency record of how AI assistance was used to build **CAPITA**
(*deterministic AI financial security — "the model proposes; policy decides"*).
This documents what was AI-generated, what was human-directed, which AI systems
are used at runtime, and honest notes about scope and limitations. It exists so
judges and reviewers can see exactly where AI sits in both the *build process*
and the *running product*.

---

## 1. Two distinct roles of AI in this project

There are two separate things people mean by "AI" here — keep them apart:

| Role | What it means | Trust level |
| --- | --- | --- |
| **Build-time AI** | An AI coding assistant helped write the source code, docs, and tests. | Reviewed by a human before commit. |
| **Runtime AI (the LLM in the product)** | Google Gemini (primary) / Claude (secondary) act as the **untrusted proposer** inside CAPITA. | **Untrusted by design** — never decides anything. |

The core product thesis is precisely about *not* trusting runtime AI with
authority: **the model proposes, deterministic policy decides.**

---

## 2. Build-time AI usage

### Tooling
- **AI coding assistant** used inside the IDE to scaffold, implement, refactor,
  and document the codebase across the session.
- All AI output was reviewed, run, and verified by a human before being
  committed. Every feature was tested (build passing, endpoints exercised,
  self-tests green) prior to push.

### What AI assistance produced (by area)
- **Frontend** (`frontend/`): React + Vite + Tailwind + Framer Motion single-page
  app; glassmorphism design system; Three.js/WebGL background; all sections
  (Hero, Problem, How it works, Trust Console, Attack Lab, Privacy, Audit Log,
  Security); components (glass button, navbar, reveal, decision badge, payment
  checkout, security report, QR share, public verify page).
- **Backend** (`backend/`): Express API; deterministic decision engine; injection
  detection; grounding engine; HMAC-SHA256 tamper-evident audit log + append-only
  truncation checkpoint; Pedersen commitment + bit-decomposition range proof
  (predicate ZK proof); attack lab suite; LLM proposer with failover; multilingual
  report generator; mock payment gateway with server-side re-validation.
- **Evaluation** (`bench/`): reproducible harness measuring detection rate,
  grounding accuracy, attack block rate, and proof latency.
- **Docs**: `README.md`, `DEFENSE_MECHANISM.md/.txt`, `WALKTHROUGH_FOR_JUDGES.md`,
  and this ledger.

### Human direction
The human author drove the product direction, the security model, the feature
list (including the FS-2605 additional features), design/UX choices, provider
selection (Gemini primary / Claude secondary), and reviewed/accepted every change.
Iteration was conversational: request → implement → verify → refine.

---

## 3. Runtime AI usage (the LLM inside CAPITA)

### Where the model runs
- Only in **one isolated module**: `backend/src/llm/proposer.js`.
- Routing: **Gemini (primary) → Claude (secondary) → local heuristic (fallback)**.
- It is also used to **translate** multilingual security reports
  (`translateReport` in the same module) — translation only, never decisions.

### What the model is allowed to do
- Read a document inside an `<untrusted_content>` block and return a **structured
  proposal**: proposed action, amount, beneficiary, embedded instructions it
  *noticed* (flagged, never obeyed), a summary, and a confidence.

### What the model is NOT allowed to do
- It **never** decides `execute / refuse / escalate`. That is computed by the
  deterministic engine (`backend/src/decisionEngine.js`).
- It **never** touches the payment gateway. Payment is only reachable via
  `LLM → CAPITA → ALLOW → user confirmation → gateway` (server re-validates).
- Its output is treated as **untrusted input** to the deterministic layers,
  exactly like the document itself.

### Models / providers
| Tier | Provider | Model | Role |
| --- | --- | --- | --- |
| Primary | Google Gemini | `gemini-flash-latest` (thinkingBudget 0) | Proposer + report translation |
| Secondary | Anthropic Claude | `claude-3-5-sonnet` | Proposer (failover) |
| Fallback | Local heuristic | none (deterministic extractor) | Always-available proposer |

Keys are read from `backend/.env` (gitignored). With no keys or unreachable
providers, the system degrades to the local heuristic and still works — the
decision layer never depends on the LLM being reachable.

---

## 4. What is deterministic (NOT AI) — the security guarantees

To be explicit for reviewers: the parts that provide the actual security are
plain, testable code, not model output.

- **Decision engine** — injection detection (regex + unicode/homoglyph/
  multilingual scans), grounding (real `String.indexOf` offsets), and the policy
  rules `SRC / INJ / GRD / LMT / CFM`.
- **Audit log** — SHA-256 payload hashing + HMAC-SHA256 hash chaining; verified
  by `verify()` and `verifyAgainstCheckpoint()`.
- **ZK predicate proof** — Pedersen commitment + Chaum-Pedersen OR-proofs over a
  1024-bit MODP group; verification uses only public data.
- **Payment gateway** — server re-runs the decision engine before charging;
  the mock gateway moves no real money.

These are covered by self-tests: `npm run test:proof`, `npm run test:audit`, and
the `npm run bench` harness whose results back the published metrics.

---

## 5. Honesty & limitations (declared, not hidden)

- **ZK parameters** are 1024-bit MODP, chosen for interactive latency — a real
  ZK range-proof demonstration, not a production parameter set.
- **Audit log** is tamper-*evident*, not tamper-*proof*; truncation detection via
  the co-located checkpoint can be defeated by an attacker with write access to
  both stores on the same host. A production build would use an off-host / WORM /
  transparency-log checkpoint.
- **Claude secondary** is wired but the specific token used doesn't authenticate
  against the public endpoint, so it fails over to the local proposer. The
  failover behavior is what matters and it works.
- **Payments** are simulated via a mock gateway; no real funds move.
- **State** (audit log, shared proofs, pending checkouts) is in-memory for the
  demo and does not persist across restarts.
- We do **not** claim perfect security. The claim is narrow and true: the blast
  radius of a compromised or prompt-injected model is *bounded* by deterministic
  controls it cannot override.

---

## 6. Build history (commits)

| Commit | Summary |
| --- | --- |
| `41e35fc` | Capita: deterministic AI financial security (frontend + backend, FS-2605 features) |
| `a2371fb` | Audit log: detect tail truncation via append-only external checkpoint |
| `d5a8382` | Add multilingual security reports (LLM translates, deterministic decision unchanged) |
| `d443f27` | Add shareable ZK proof verification (link + QR + public /verify page, balance never exposed) |
| `e707ee9` | Add secure mock payment handoff (server re-validates ALLOW; LLM can never trigger payment) |
| `3a654f7` | Add vercel.json (frontend + backend services with API rewrites) |

Repository: https://github.com/DropOutsCore/capitaa

---

## 7. Attribution summary

- **Code & docs:** written with AI coding-assistant support, human-reviewed and
  verified before every commit.
- **Runtime LLM:** Google Gemini (primary), Anthropic Claude (secondary) — used
  strictly as an untrusted proposer/translator, never as a decision-maker.
- **Security logic, cryptography, and audit guarantees:** deterministic code,
  self-tested and benchmarked — independent of any AI model.

*Principle: the model proposes; deterministic policy decides.*
