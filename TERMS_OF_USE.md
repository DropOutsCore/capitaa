# Terms of Use — Capita (Draft Excerpt)

**This is a draft for demonstration purposes, prepared for a hackathon
submission. It is not a legally reviewed document and should not be used
in production without review by qualified legal counsel.**

---

## 1. Scope of Authority Granted

1.1. By enabling Capita on your account, you grant Capita's automated
assistant limited authority to propose and, subject to the conditions in
Section 2, execute financial actions on your behalf, strictly limited to
the action types and value limits configured in your account settings.

1.2. The current default autonomous action limit is **₹1,00,000 per
transaction**. Any proposed action exceeding this limit will be held for
human approval and will never execute autonomously, regardless of any
instruction contained within a document, email, or other content processed
by the assistant.

1.3. Any request to change a payment beneficiary's bank details will always
be held for human approval, regardless of transaction value, source, or
claimed urgency. This is a fixed system behavior, not a configurable
setting, and cannot be altered by content the assistant processes.

## 2. Human-in-the-Loop Guarantee

2.1. Capita commits that the following categories of action will never
execute without explicit human confirmation:
   (a) any transaction exceeding the configured autonomous limit;
   (b) any change to beneficiary or payee bank details;
   (c) any action where the assistant's grounding check cannot verify the
       claimed figures against the source document; and
   (d) any action the assistant's refusal policy classifies as ambiguous
       rather than clearly safe.

2.2. This guarantee is enforced by deterministic code external to the
underlying AI model, not by instructing the model to behave a certain way.
You may request a technical description of this enforcement mechanism at
any time under Section 5 (Audit Rights).

## 3. Data Usage and Retention

3.1. Documents submitted for processing (invoices, emails, memos, and
similar content) are treated as untrusted input data and are stored for
the purpose of grounding verification and audit logging.

3.2. [PLACEHOLDER — retention period to be defined, e.g. "retained for 7
years in line with applicable financial recordkeeping requirements" or
"retained for 90 days then purged," depending on the adopting
institution's own policy]

3.3. Submitted content is not used to train or fine-tune any underlying AI
model without separate, explicit consent.

## 4. Model Provider Disclosure

4.1. Capita's assistant is powered by one or more third-party AI model
providers. [PLACEHOLDER — name providers actually in use, e.g. "Anthropic
Claude" and "Google Gemini," with a fallback to an on-premises/local model
under defined failover conditions].

4.2. In the event a primary or secondary provider becomes unavailable,
processing automatically falls through to a local, non-hosted fallback
mechanism. Enforcement of the guarantees in Section 2 is identical
regardless of which underlying model is active.

## 5. Audit Rights

5.1. You, or an auditor you designate, may request:
   (a) a complete export of the action log for your account;
   (b) independent verification of the audit log's hash-chain integrity
       via the verification method described in our technical
       documentation; and
   (c) a summary report of refusals, escalations, and detected injection
       attempts associated with your account.

5.2. Capita's audit log is cryptographically tamper-evident. Any
retroactive modification of a logged entry will be independently
detectable using the verification method provided; this is a technical
property you may confirm yourself rather than needing to rely solely on
our representation.

## 6. Liability Allocation

6.1. [PLACEHOLDER — this clause requires actual legal drafting; the
structure below is illustrative only, not usable as-is]

Capita's liability for an incorrectly executed transaction is limited to
cases where:
   (a) the transaction exceeded the configured autonomous limit and was
       executed without human approval due to a defect in Capita's
       enforcement mechanism; or
   (b) the audit log for the transaction cannot be independently verified
       as intact.

Capita is not liable for transactions correctly executed in accordance
with instructions explicitly confirmed by an authorized human user, even
where the underlying request originated from fraudulent source content,
provided the applicable guarantees in Section 2 were correctly enforced.

## 7. Incident Notification

7.1. In the event of a confirmed security incident affecting your account
data or transaction integrity, Capita will notify you within
[PLACEHOLDER — e.g. "72 hours"] of confirmation, consistent with
applicable regulatory notification requirements.

---

### Why these seven sections and not a generic template

A generic SaaS Terms of Use (data processing, IP ownership, termination
rights, governing law) still applies underneath this, but doesn't address
what a bank's risk team actually asks first about a money-moving AI
assistant: *what exactly can it do without asking, what happens when it's
wrong, and can we check your work ourselves.* Sections 1, 2, and 5 are the
ones worth reading aloud in your pitch — they directly restate, in legal
language, the same guarantees your live demo proves technically.
