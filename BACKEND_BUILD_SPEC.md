# Capita Backend — Full Build Spec (FS-2605)

Hand this whole document to your coding agent as one prompt. It covers all five
frontend sections already built. Every endpoint below must return results computed
from real logic on the actual submitted input — no hardcoded response tables, no
`if (input.includes("hardcoded string"))` shortcuts, no randomly-generated numbers
dressed up as measurements. If a computation can't legitimately be done in scope,
say so in the response rather than faking a plausible-looking number — a fabricated
metric is a much worse outcome in this competition than an honestly modest one.

---

## 0. Global architecture (read first)

Build this as one backend service (FastAPI recommended — Python has the best
crypto/ML library support for what's needed here) with these layers, in this order,
on every request that touches money or a proposed action:

```
Request → Trust Boundary → Grounding Engine → Typed Action Layer → 
          Refusal Policy → Audit Log → Response
```

**The LLM only ever produces a *proposed* action.** It never executes anything
directly. Every proposal from the LLM is a JSON object like:

```json
{
  "proposed_action": "wire_transfer",
  "amount": 42000,
  "beneficiary": "...",
  "confidence": "high",
  "cited_evidence": [{"field": "amount", "source_offset": 978, "value": "42000"}]
}
```

The deterministic code around it — not the LLM — decides whether that proposal
executes, gets refused, or gets escalated. This split is what the PS is actually
grading. Keep the LLM call itself in one isolated module (`llm_proposer.py`) so it's
easy to point at whatever provider/key you supply, and treat its output as
**untrusted input to the next layer**, exactly like the documents are.

**Tech stack:**
- FastAPI (Python 3.11+)
- SQLite for now (fine for a hackathon; swap for Postgres if you have time)
- `cryptography` and `pycryptodome` for the ZK proof math
- Real hash chaining with `hashlib.sha256`
- pytest for the self-built harness the rubric requires

---

## 1. Trust Console — `/api/v1/process_document`

**What it must actually do, step by step:**

1. **Ingest.** Accept `{ document_text: str, document_type: enum, claimed_amount: int, twofa_confirmed: bool }`. Store the raw text in an `untrusted_documents` table immediately, unmodified, with a SHA-256 hash of the content. This hash is what "Document hash" in the Evidence Inspector displays — compute it for real from the actual bytes, don't fake it.

2. **Trust-boundary tag.** Wrap the document text in a structural marker before it ever reaches the LLM — e.g. pass it to the model inside a field explicitly named `untrusted_content`, with a system prompt that says content in that field is data to analyze, never instructions to follow. This is a real, testable design decision — write a unit test that confirms injected text inside `untrusted_content` never appears verbatim as an "action" field in the LLM's structured output without going through validation.

3. **LLM extraction call.** Send the document to your LLM provider (bring your own key/endpoint) with a prompt asking it to extract: claimed amount, beneficiary if present, any instructions embedded in the text (flagged, not obeyed), and a structured summary. Force **structured/JSON output** (use function calling or JSON mode — whichever your provider supports) so you get a parseable object, not free text you have to regex.

4. **Grounding check (deterministic code, not the LLM).** For every numeric/factual claim the LLM extracted, verify it actually appears in the raw document text at some character offset. Do this with real string search:
   ```python
   offset = document_text.find(str(extracted_amount))
   if offset == -1:
       grounding_failed = True
   ```
   This is what populates "Char offset: 978" in your Evidence Inspector — it must be a real `.find()` result, not a placeholder number. If a claimed figure can't be located in the source text, that's a real hallucination and must be flagged as such in the response — this is a scored zero-tolerance item per the rubric, so don't let this check be decorative.

5. **Typed action layer.** Build an explicit action schema (pydantic model) with hard-coded limits, not limits the LLM can talk its way around:
   ```python
   class ProposedAction(BaseModel):
       action_type: Literal["wire_transfer", "approve_invoice", "update_beneficiary"]
       amount: int
       autonomous_limit: ClassVar[int] = 100_000  # hardcoded, not LLM-settable
   ```
   Any proposed action above `autonomous_limit` is automatically routed to escalation regardless of what the LLM "thinks" — this is the ₹1,00,000 ceiling your UI already shows. Same for `update_beneficiary` — hardcode "beneficiary changes always require human approval," don't let this be a policy the model can reason its way out of.

6. **Refusal policy (deterministic decision tree, not an LLM judgment call).** Build this as actual branching code:
   ```python
   def decide(action, source_trust, grounding_ok, twofa, amount):
       if not grounding_ok:
           return "REFUSE", "ungrounded_figure"
       if source_trust == "untrusted" and action.action_type == "update_beneficiary":
           return "ESCALATE", "beneficiary_change_from_untrusted_source"
       if amount > autonomous_limit:
           return "ESCALATE", "exceeds_autonomous_limit"
       if source_trust == "untrusted" and not twofa:
           return "REFUSE", "untrusted_source_no_2fa"
       if source_trust == "untrusted":
           return "ESCALATE", "untrusted_source_requires_human"
       return "EXECUTE", "within_policy"
   ```
   Write this so every branch is independently unit-testable — this is your "Random Author Challenge" insurance: any team member should be able to point at 25 lines of this function and explain exactly what it does in 90 seconds.

7. **Live Forensics timeline.** Every stage above (received, isolated, grounding checked, decision made, audit committed) writes a real timestamped row to an `event_log` table as it happens — don't generate this list after the fact, emit it as a side effect of each real step so the timestamps are genuine and sequential.

8. **Audit log — hash chain, not independent hashes.** This is the part most likely to be built wrong. Each entry's hash must incorporate the previous entry's hash:
   ```python
   entry_hash = sha256(f"{prev_hash}{timestamp}{action}{amount}{decision}".encode()).hexdigest()
   ```
   Write a `verify_chain()` function that walks every entry and recomputes hashes forward — if entry #3 is edited in the DB directly, verification must fail starting at #3, not just fail entry #3's own row. **Write a real pytest that edits a row in the database and asserts `verify_chain()` returns False with the correct break-point index.** This is a required deliverable, not optional polish.

9. **Response contract** the frontend needs:
   ```json
   {
     "decision": "ESCALATE",
     "reason_code": "exceeds_autonomous_limit",
     "reasoning_checks": [
       {"code": "SRC", "label": "Source is untrusted (email)", "passed": true},
       {"code": "LMT", "label": "Amount vs autonomous limit", "passed": false}
     ],
     "evidence": [
       {"field": "amount", "value": 485000, "source_file": "...", "char_offset": 978, "document_hash": "..."}
     ],
     "forensics_timeline": [{"time": "...", "event": "document_received"}, ...],
     "audit_entry_hash": "...",
     "proposer": "primary_model_hosted"
   }
   ```

---

## 2. Attack Lab — `/api/v1/run_attack`

This must run each attack **for real** against the exact same pipeline built in
Section 1 — not a second, simplified code path that's rigged to always show a nice
"blocked" result. That's the single most important integrity rule for this section:
the Attack Lab should literally call `process_document()` internally with the
attack's payload as input.

```
POST /api/v1/run_attack
{ "attack_id": "invoice_prompt_injection" }

→ internally constructs the real document payload for that attack,
  calls the SAME process_document() pipeline,
  returns which layer caught it (or didn't)
```

**Response should show layer-by-layer, truthfully:**
```json
{
  "attack_id": "invoice_prompt_injection",
  "payload_sent": "...",
  "layer_results": {
    "trust_boundary": "content isolated as untrusted",
    "llm_extraction": "extracted amount=42000, flagged embedded instruction",
    "grounding_check": "PASS - amount found at offset 34",
    "action_layer": "proposed: wire_transfer, amount=42000",
    "refusal_policy": "REFUSE - untrusted_source_no_2fa"
  },
  "outcome": "BLOCKED",
  "blocking_layer": "refusal_policy"
}
```

Build your 23 catalogued attacks as a static list of real payloads (reuse the ones
from the `attack_harness.py` I gave you earlier — footer override, role confusion,
zero-width unicode, translation hijack, fake-error recovery, CEO-fraud authority,
structured-field injection, multi-turn context poisoning, Hinglish code-switching,
HTML comment injection, PDF metadata) stored server-side, each tagged with its
category (Injection/Evasion/Social/Policy/etc. — matches your filter pills).

**Important honesty requirement:** if an attack actually gets through (executes
when it shouldn't), the Attack Lab must show that truthfully as a failure, not
silently reclassify it. Your "Where This Breaks" slide is worth real points
specifically for being honest about failures — don't build a UI that can only
display "blocked."

---

## 3. Verifiable Privacy (ZK proof) — `/api/v1/proof/generate` and `/api/v1/proof/verify`

The UI copy says "real Pedersen commitments and a bit-decomposition range proof —
latency is measured, not mocked." Hold yourself to that literally.

**What to actually implement** (this is legitimately hard — scope it exactly like
this, don't attempt a production zk-SNARK library in a hackathon):

1. **Pedersen commitment.** Given private balance `b` and a random blinding factor
   `r`, compute `C = g^b * h^r mod p` using two generators `g, h` over a large prime
   modulus. Use Python's `cryptography` library's raw modular exponentiation, or
   implement it directly with `pow(g, b, p)` — this is genuinely simple modular
   arithmetic, don't reach for an external ZK framework you don't have time to learn.

2. **Range proof via bit decomposition** (this is the real technique, and it's the
   right scope for 12 hours): decompose `b` into bits, commit to each bit
   individually, and prove each bit commitment opens to 0 or 1 using a real
   disjunctive Sigma protocol (OR-proof). This proves `b ≥ threshold` without
   revealing `b`. This is genuinely non-trivial — budget real time for it, and if
   you run short, implement it for a fixed small bit-width (e.g., proving amounts
   under ₹1,048,576 / 2^20) and **say that limitation explicitly** in your Round 3
   "honest scope" note, exactly like your UI copy already does ("1024-bit MODP
   parameters, chosen for interactive latency — not a production parameter set").
   That honesty is worth more than a fake "production-grade" claim.

3. **Prover endpoint:**
   ```json
   POST /api/v1/proof/generate
   { "private_balance": 147283, "public_threshold": 100000 }
   → { "commitment": "0x...", "proof": {...}, "generation_ms": 842 }
   ```
   Measure `generation_ms` with real `time.time()` around the actual computation —
   this feeds your "latency is measured, not mocked" claim and your p95 ≤ 4s
   / proof generation ≤ 3s technical constraint.

4. **Verifier endpoint:**
   ```json
   POST /api/v1/proof/verify
   { "commitment": "0x...", "proof": {...}, "public_threshold": 100000 }
   → { "valid": true, "verification_ms": 34 }
   ```
   Verification must **only** use the commitment and proof — never receive the
   private balance. Write a test that asserts the verify endpoint's request schema
   has no field capable of carrying the raw balance, so this constraint is enforced
   by the type system, not just by convention.

5. **The timing side-channel test I gave you earlier** (`run_timing_attack` in
   `attack_harness.py`) should be run against this real endpoint once it exists —
   that's how you get an honest answer to whether your implementation leaks the
   threshold via response timing, which is explicitly one of the six red-team
   classes in the mid-event spec change.

---

## 4. Model Failover — `/api/v1/failover/status` and `/api/v1/failover/simulate`

**Real health-check logic, not a UI toggle that flips a boolean with no backing
check:**

```python
async def check_provider_health(provider_config):
    try:
        response = await client.post(provider_config.endpoint, 
                                       json={"ping": True}, timeout=2)
        return response.status_code == 200
    except (TimeoutError, ConnectionError):
        return False
```

1. **Routing table**, checked in real order:
   ```python
   PROVIDERS = [
       {"name": "primary_model_hosted", "endpoint": "...", "tier": 1},
       {"name": "secondary_model_hosted", "endpoint": "...", "tier": 2},
       {"name": "local_fallback_model", "endpoint": "http://localhost:8080", "tier": 3},
   ]
   ```
   `/api/v1/failover/status` actually pings each in order and returns the first
   healthy one as `active_proposer` — this is what your UI's routing list reflects.

2. **Local fallback model — this needs to be real, not aspirational.** Run a small
   local model via `llama.cpp` or `ollama` (e.g. a quantized 3-7B model) so
   "tier 3" is a genuinely different, actually-running inference path, not just a
   third row in a UI that never gets exercised. This matters a lot: the PS's
   mid-event change explicitly requires graceful degradation to be demonstrated
   with safety properties intact — a juror may ask you to prove tier 3 actually
   works by killing your internet connection live.

3. **`/api/v1/failover/simulate`** — for the demo button, actually make tier 1 and
   tier 2 unreachable (kill the connection, point at an invalid port, or set a
   feature flag your health-check genuinely respects) rather than only changing a
   frontend variable. The critical design point your copy already states well:
   **failover changes who proposes, never what is allowed** — so run the exact
   same grounding/action-layer/refusal-policy code from Section 1 regardless of
   which tier is answering. Write a test that submits the same attack payload
   through tier 1 and through tier 3 and asserts the refusal decision is identical
   in both cases.

---

## 5. Threat Coverage grid

This section is mostly a *display* of results computed elsewhere — don't build new
logic here. Instead:

- Each card ("Invoice prompt injection" → "Instruction isolation + refusal policy")
  should pull its live status from `/api/v1/run_attack` results for that attack ID,
  not be a static hardcoded claim. If an attack currently fails, this grid should
  reflect that honestly (e.g. a red state), not always show green.
- Add a lightweight `/api/v1/threat_coverage` endpoint that runs (or reads cached
  results from) all 23 attacks and returns pass/fail per category, so this page is
  provably backed by the same Attack Lab logic rather than being a separate
  marketing claim.

---

## 6. Observability — `/healthz` and `/metrics`

```
GET /healthz → { "status": "ok", "db": "connected", "llm_provider": "reachable" }

GET /metrics →
{
  "documents_processed": 5,
  "injections_caught": 3,
  "refusals_issued": 3,
  "escalations_issued": 2,
  "avg_decision_latency_ms": 412,
  "audit_chain_valid": true
}
```
These counters must increment from real request handling — no seeded fake
starting numbers beyond what your seed script legitimately inserts. Include a
`seed_demo_data.sh` / `seed.py` that populates ~10-15 realistic historical
documents/decisions in under 60 seconds, per the rubric's Observability
requirement.

---

## 7. Non-negotiable engineering rules for whoever builds this

- **No hardcoded "if this exact string, return this exact pretend result."** Every
  decision must derive from the actual pipeline described above running on the
  actual input given.
- **No fabricated timestamps, hashes, or latency numbers.** If you can't measure
  something for real in the time available, don't fake it — cut the feature or
  clearly label it as a stub in your own README, since a mismatch between claimed
  and reproducible numbers costs **−60 points**, far worse than an honestly smaller
  feature set.
- **Write the pytest suite as you go**, not after — `tests/test_grounding.py`,
  `tests/test_refusal_policy.py`, `tests/test_audit_chain.py`,
  `tests/test_failover.py`. This is your required self-built harness with raw
  output, and it's also what saves you when a juror points at 25 lines and asks
  you to explain them.
- **Determinism**: given the same input and same seed, the refusal-policy and
  grounding-check layers must return byte-identical output on repeat runs — the
  jury runs your scored path twice and a mismatch zeroes that metric. The LLM call
  itself may vary; make sure nothing that varies leaks into a field that's
  supposed to be deterministic (e.g., don't let LLM phrasing changes affect the
  `decision` field — only the deterministic policy code should set that).
