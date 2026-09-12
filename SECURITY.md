# SECURITY.md

## Reporting a Vulnerability

If you believe you've found a security vulnerability in Capita, please
report it responsibly:

- **Email:** [PLACEHOLDER — team-security@yourteam.example]
- **Do not** open a public GitHub issue for security vulnerabilities.
- **Response commitment:** we will acknowledge receipt within 48 hours and
  provide an initial assessment within 5 business days.
- **Scope:** this covers the Capita application, API, and infrastructure as
  deployed for this submission. It does not cover the underlying hosted LLM
  providers' own infrastructure — report those directly to the provider.

We ask reporters not to publicly disclose a vulnerability until we've had a
reasonable opportunity to address it. We will credit reporters (with
permission) in our disclosure notes.

## What We Consider In-Scope

- Prompt injection bypassing the refusal policy or action layer
- Grounding check bypass (a hallucinated figure accepted as verified)
- Audit log tampering that evades hash-chain or checkpoint detection
- Authentication/authorization flaws in the action-execution path
- Information leakage from the predicate proof system (e.g. timing
  side-channels revealing the private balance or threshold)

## What's Explicitly Out of Scope for This Submission

- Denial-of-service via extremely high request volume (rate limiting is
  present but not hardened against distributed attacks)
- Physical security of any deployment infrastructure
- Social engineering against the human approvers themselves

---

# Security & Trust Summary — One Page

**Capita** — Injection-resistant financial assistant with verifiable privacy

## Architecture in one sentence

The AI model only ever *proposes* an action; every proposal passes through
deterministic code — grounding verification, a typed action layer with hard
limits, and a calibrated refusal policy — before anything executes, and
every decision is recorded in a tamper-evident audit log.

## Threat model (fixed at Round 1, unchanged since)

We defend against: prompt injection via document content (invisible text,
metadata, role-confusion, multi-turn context poisoning, code-switched
input), unauthorized beneficiary changes, over-limit autonomous payments,
audit log tampering (both single-entry edits and full-entry truncation),
and timing/size side-channels against our privacy-preserving proof system.

We do **not** currently defend against: physical compromise of the host
running both the database and the audit checkpoint simultaneously (an
attacker with that level of access could in principle defeat both the hash
chain and the checkpoint together — see Accepted Weakness below);
distributed denial-of-service at scale; or compromise of the human
approver's own credentials outside our system.

## Controls, mapped to what actually stops what

| Attack class | Control that stops it | Enforced by |
|---|---|---|
| Hidden instruction in document | Instruction/data trust boundary — content is isolated, never concatenated as instruction | Deterministic ingestion code |
| Ungrounded/hallucinated figure | Every claimed number must resolve to a real character offset in the source | Grounding engine |
| Over-limit autonomous payment | Hard-coded ₹1,00,000 ceiling, not model-adjustable | Typed action layer |
| Unauthorized beneficiary change | Always escalates to human, regardless of amount or claimed urgency | Refusal policy |
| Audit log entry tampering | HMAC hash-chain; a single edit cascades to every later entry | `verify_chain()` |
| Audit log truncation | Append-only external checkpoint tracks entry count independently | `verify_against_checkpoint()` |
| Provider outage | Automatic failover to local heuristic fallback; same policy enforced regardless of tier | Failover router |
| Balance disclosure via proof queries | Pedersen commitment + range proof reveals only pass/fail, not value | Predicate proof service |

## Accepted weakness (stated plainly, not hidden)

An attacker with simultaneous write access to both the primary database
and the append-only checkpoint file, on the same host, could in principle
defeat truncation detection by removing evidence from both locations
together. We accept this risk for the current deployment scope because:
(a) it requires a significantly higher level of compromise than either
control alone defends against, and (b) the economically rational fix —
writing the checkpoint to a separate host or a genuine WORM store — is a
straightforward infrastructure change we scoped out of a 12-hour build
rather than a design flaw requiring rearchitecture.

## What we'd need before real production adoption

At-rest database encryption, formal consent-capture flow for processing
sensitive financial data, data localization guarantees tied to the
specific LLM provider/region selected, and a completed compliance mapping
against RBI outsourcing and data-security guidelines (see
`COMPLIANCE_MAPPING.md`). None of these are silently missing — they're
named here because a real adoption decision needs them named, not
discovered later.
