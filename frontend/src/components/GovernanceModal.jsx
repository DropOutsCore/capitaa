import { AnimatePresence, motion } from 'framer-motion';
import { EASE } from '../lib/motion.js';

// A lightweight modal that renders the governance docs (Security, Compliance,
// Terms) in-app so reviewers can read them without leaving the site. Content is
// summarized from SECURITY.md / COMPLIANCE_MAPPING.md / TERMS_OF_USE.md in the
// repo root (linked at the bottom of each doc).

const DOCS = {
  security: {
    title: 'Security & Trust',
    file: 'SECURITY.md',
    body: (
      <>
        <P><b>Architecture in one sentence.</b> The AI model only ever <i>proposes</i> an action; every proposal passes through deterministic code — grounding verification, a typed action layer with hard limits, and a calibrated refusal policy — before anything executes, and every decision is recorded in a tamper-evident audit log.</P>

        <H>Reporting a vulnerability</H>
        <Ul items={[
          'Email: team-security@yourteam.example (placeholder)',
          'Do not open a public GitHub issue for security vulnerabilities.',
          'We acknowledge within 48 hours and give an initial assessment within 5 business days.',
          "Scope: the Capita app, API, and infrastructure as deployed — not the hosted LLM providers' own infrastructure.",
        ]} />

        <H>Controls — what actually stops what</H>
        <Table
          head={['Attack class', 'Control', 'Enforced by']}
          rows={[
            ['Hidden instruction in document', 'Instruction/data trust boundary', 'Deterministic ingestion'],
            ['Ungrounded / hallucinated figure', 'Must resolve to a real source offset', 'Grounding engine'],
            ['Over-limit autonomous payment', 'Hard-coded ₹1,00,000 ceiling', 'Typed action layer'],
            ['Unauthorized beneficiary change', 'Always escalates to human', 'Refusal policy'],
            ['Audit log entry tampering', 'HMAC hash-chain cascades', 'verify_chain()'],
            ['Audit log truncation', 'Append-only external checkpoint', 'verify_against_checkpoint()'],
            ['Provider outage', 'Failover to local heuristic, same policy', 'Failover router'],
            ['Balance disclosure via proofs', 'Pedersen commitment + range proof', 'Predicate proof service'],
          ]}
        />

        <H>Accepted weakness (stated plainly)</H>
        <P>An attacker with simultaneous write access to <i>both</i> the primary database and the append-only checkpoint file, on the same host, could defeat truncation detection. We accept this for the current scope: it needs a far higher level of compromise than either control alone, and the fix (off-host / WORM checkpoint) is an infrastructure change, not a design flaw.</P>

        <H>Before production adoption</H>
        <P>At-rest DB encryption, a formal consent-capture flow, data-localization guarantees tied to the chosen LLM region, and a completed compliance mapping. Named here on purpose — not silently missing.</P>
      </>
    ),
  },
  compliance: {
    title: 'Compliance Mapping',
    file: 'COMPLIANCE_MAPPING.md',
    body: (
      <>
        <P>Mapped against the frameworks an Indian financial institution's compliance team would check. Status is marked honestly — overclaiming is worse than a short list.</P>

        <H>RBI — Digital Payment Security Controls</H>
        <Table
          head={['Requirement', 'Status', 'How']}
          rows={[
            ['MFA for high-value transactions', 'ADDRESSED', '2FA + hard ₹1,00,000 limit; above it always escalates'],
            ['Fraud / anomaly detection', 'ADDRESSED', 'Grounding + refusal policy as real-time detection'],
            ['Transaction logging (non-repudiation)', 'ADDRESSED', 'HMAC hash-chain + append-only checkpoint'],
            ['Encryption in transit & at rest', 'GAP', 'TLS in transit; at-rest DB encryption not yet built'],
          ]}
        />

        <H>RBI — Outsourcing of IT Services (2023)</H>
        <Table
          head={['Requirement', 'Status', 'How']}
          rows={[
            ['Right to audit the provider', 'ADDRESSED', 'Audit log queryable; hash-chain verifiable independently'],
            ['Business continuity / exit plan', 'PARTIAL', 'Model failover to local fallback; no formal exit clause yet'],
            ['Grievance redressal', 'GAP', 'Needs a defined complaint SLA before adoption'],
          ]}
        />

        <H>Data localization · PCI-DSS · IT Act / SPDI</H>
        <Ul items={[
          'Data localization (RBI 2018): GAP — depends on LLM region; the local fallback tier is the more compliant path for sensitive data.',
          'PCI-DSS: OUT OF SCOPE by design — Capita handles bank transfers/invoices, not card PANs.',
          'IT Act / SPDI consent capture: GAP (institution-layer). Section 43A reasonable practices: PARTIAL.',
        ]} />

        <H>Honest summary</H>
        <P>Strong on real-time fraud detection, transaction non-repudiation, and audit rights — provably working, not aspirational. Explicitly weak on at-rest encryption, formal consent flows, and data-localization guarantees — named rather than hidden.</P>
      </>
    ),
  },
  terms: {
    title: 'Terms of Use (Draft)',
    file: 'TERMS_OF_USE.md',
    body: (
      <>
        <P className="text-signal-escalate/90"><b>Draft for demonstration only.</b> Not legally reviewed; do not use in production without qualified legal counsel.</P>

        <H>1 · Scope of authority</H>
        <P>The default autonomous limit is <b>₹1,00,000 per transaction</b>. Anything above it is held for human approval and never executes autonomously — regardless of any instruction inside a processed document. Any beneficiary bank-detail change is <i>always</i> held for human approval, regardless of value or claimed urgency; this is fixed system behavior, not a configurable setting.</P>

        <H>2 · Human-in-the-loop guarantee</H>
        <P>These never execute without explicit human confirmation: (a) transactions over the limit; (b) beneficiary/payee changes; (c) actions where grounding can't verify the figures; (d) anything the refusal policy classifies as ambiguous. Enforced by deterministic code <i>external</i> to the AI model — not by instructing the model.</P>

        <H>5 · Audit rights</H>
        <P>You (or your auditor) may request a full action-log export, independent hash-chain integrity verification, and a summary of refusals/escalations/injection attempts. The log is cryptographically tamper-evident — a property you can confirm yourself rather than trust our word.</P>

        <P className="text-white/40">Full sections (data usage/retention, provider disclosure, liability, incident notification) are in <code>TERMS_OF_USE.md</code>.</P>
      </>
    ),
  },
};

export default function GovernanceModal({ docKey, onClose }) {
  const doc = docKey ? DOCS[docKey] : null;
  return (
    <AnimatePresence>
      {doc && (
        <div className="fixed inset-0 z-[70] grid place-items-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="glass glass-edge relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-3xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h3 className="font-display text-lg font-semibold text-white">{doc.title}</h3>
              <button onClick={onClose} className="text-white/40 transition-colors hover:text-white">✕</button>
            </div>
            <div className="overflow-y-auto px-6 py-5 text-sm leading-relaxed text-white/70">
              {doc.body}
            </div>
            <div className="flex items-center justify-between border-t border-white/10 px-6 py-3 text-[11px] text-white/40">
              <span>Full document: <code className="text-white/60">{doc.file}</code> in the repo</span>
              <button onClick={onClose} className="rounded-lg border border-white/12 bg-white/[0.04] px-3 py-1.5 text-xs text-white/70 hover:text-white">Close</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* — small presentational helpers — */
function P({ children, className = '' }) {
  return <p className={`mb-3 ${className}`}>{children}</p>;
}
function H({ children }) {
  return <h4 className="mb-1.5 mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-accent/80">{children}</h4>;
}
function Ul({ items }) {
  return (
    <ul className="mb-3 space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-accent" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}
function Table({ head, rows }) {
  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-white/10">
      <table className="w-full text-left text-[12px]">
        <thead>
          <tr className="bg-white/[0.04] text-white/50">
            {head.map((h, i) => <th key={i} className="px-3 py-2 font-medium">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-white/6">
              {r.map((c, j) => (
                <td key={j} className={`px-3 py-2 ${j === 1 ? statusColor(c) : 'text-white/65'}`}>
                  {j === 2 ? <code className="text-[11px]">{c}</code> : c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function statusColor(s) {
  if (s === 'ADDRESSED') return 'text-signal-execute font-semibold';
  if (s === 'PARTIAL') return 'text-signal-escalate font-semibold';
  if (s.startsWith('GAP')) return 'text-signal-refuse font-semibold';
  return 'text-white/65';
}
