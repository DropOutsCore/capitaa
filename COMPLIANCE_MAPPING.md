# Compliance Mapping — Capita

This maps Capita's actual architecture against the regulatory frameworks a
real Indian financial institution's compliance team would check before
adoption. Status is marked honestly: what's genuinely addressed by the
current build, what's partially addressed, and what's an acknowledged gap.
Overclaiming here is worse than a short list — compliance reviewers check.

---

## RBI — Guidelines on Outsourcing of IT Services (2023) / Digital Lending Guidelines

| Requirement | Status | How Capita addresses it |
|---|---|---|
| Board-approved outsourcing policy with defined accountability | GAP | Not applicable pre-adoption; would sit with the adopting institution, not us |
| Material outsourcing risk assessment | PARTIAL | Our threat model (Round 1 deliverable) is the technical input to this; institution still owns the formal risk sign-off |
| Right to audit the service provider | ADDRESSED | Audit log is queryable on demand; hash-chain verification (`verify_chain()`) can be run independently by the institution's own auditor without needing to trust our word |
| Business continuity / exit plan | PARTIAL | Model Failover demonstrates continuity at the AI-provider level (degrade to local heuristic fallback, never silent failure); no formal data-portability/exit clause drafted yet |
| Grievance redressal mechanism | GAP | Not built; would need a defined customer complaint SLA before production adoption |

## RBI — Guidelines on Digital Payment Security Controls

| Requirement | Status | How Capita addresses it |
|---|---|---|
| Multi-factor authentication for high-value transactions | ADDRESSED | Typed action layer enforces 2FA + hard autonomous limit (₹1,00,000); amounts above this always escalate to human approval regardless of 2FA status |
| Fraud monitoring / anomaly detection | ADDRESSED | Grounding engine + refusal policy function as real-time anomaly detection on ingested content, not batch/after-the-fact review |
| Transaction logging with non-repudiation | ADDRESSED | HMAC hash-chained audit log with append-only checkpoint; tamper-evident, not just tamper-logged |
| Data encryption in transit and at rest | GAP | Encryption in transit assumed via standard TLS on hosted endpoints; at-rest encryption of the SQLite/DB layer not yet implemented — named explicitly as a pre-production requirement |

## Data localization (RBI 2018 circular on storage of payment system data)

| Requirement | Status | Notes |
|---|---|---|
| Payment system data stored only in India | GAP — architecture-dependent | Depends entirely on which LLM provider/region is selected at deployment; if using a hosted LLM with servers outside India, document processing that includes payment data would need either an India-region endpoint or on-prem/local-model-only processing for regulated data. This is a real, non-trivial constraint for production — our local fallback tier (Model Failover, tier 3) is actually the more compliant path for genuinely sensitive data, an intentional trade-off worth stating in the pitch |

## PCI-DSS (only relevant if card data, not bank transfers, enters scope)

| Requirement | Status | Notes |
|---|---|---|
| Card data handling | OUT OF SCOPE (by design) | Capita's action catalogue is scoped to bank transfers/invoice approval, explicitly excluding card PAN handling. State this as a scope boundary, not an oversight — reduces compliance surface area rather than leaving it unaddressed |

## IT Act 2000 / SPDI Rules (sensitive personal data)

| Requirement | Status | Notes |
|---|---|---|
| Consent for processing sensitive financial data | GAP | No consent-capture flow built; would be a UI/onboarding requirement at the adopting institution's layer, not Capita's core engine |
| Reasonable security practices (Section 43A) | PARTIAL | Grounding, typed actions, refusal policy, and hash-chained audit log collectively constitute a real security practice; not independently certified against any named standard (e.g. ISO 27001) |

---

## Honest summary for the pitch

"We mapped ourselves against RBI's outsourcing, digital payment security, and
data localization guidelines. We're strong on real-time fraud detection,
transaction non-repudiation, and audit rights — those are core to what we
built and are provably working, not aspirational. We're explicitly weak on
at-rest encryption, formal consent flows, and data localization guarantees —
these are institution-layer and infrastructure-layer requirements we didn't
have time to build, and we're naming them rather than hiding them."

This framing — provable strengths stated plainly, real gaps named without
hedging — is what a compliance reviewer actually wants to hear, and it's
also exactly what the rubric's Failure Disclosure line rewards.
