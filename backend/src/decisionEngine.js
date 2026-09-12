import { createHash } from 'node:crypto';
import { config } from './config.js';

// ---------------------------------------------------------------------------
// CORE PRODUCT PRINCIPLE: "The model proposes. Deterministic policy decides."
// The LLM (simulated here) is treated as an untrusted reasoning component.
// Financial authority lives OUTSIDE the model and is enforced by the
// deterministic controls below.
// ---------------------------------------------------------------------------

// Patterns that indicate a *document* is trying to issue instructions to the
// assistant -i.e. prompt injection smuggled inside untrusted content.
const INJECTION_PATTERNS = [
  { id: 'override', re: /\b(ignore|disregard|forget)\b.{0,30}\b(previous|prior|above|earlier)\b.{0,20}\b(instructions?|prompts?|rules?)\b/i, label: 'Instruction-override phrase' },
  { id: 'role', re: /\byou are now\b|\bact as\b|\bnew system prompt\b|\bsystem:\s/i, label: 'Role / system-prompt hijack' },
  { id: 'wire', re: /\b(wire|transfer|remit|send|pay)\b.{0,40}\b(immediately|now|urgent|asap|today)\b/i, label: 'Urgency-framed payment instruction' },
  { id: 'beneficiary', re: /\b(update|change|switch|correct)\b.{0,30}\b(bank|account|beneficiary|iban|routing|ifsc)\b.{0,30}\b(details?|number|info)?/i, label: 'Beneficiary / bank-detail change request' },
  { id: 'exfil', re: /\b(reveal|print|show|output)\b.{0,30}\b(system prompt|api key|password|secret|credentials?)\b/i, label: 'Secret / credential exfiltration attempt' },
  { id: 'authority', re: /\bthe (ceo|cfo|director|manager) (has )?approved\b|\bon behalf of\b.{0,20}\b(management|finance)\b/i, label: 'Unverifiable authority claim' },
];

// Zero-width / invisible characters used to hide instructions from human review.
const INVISIBLE_RE = /[\u200B-\u200D\uFEFF\u2060\u00AD]/g;

// Multilingual override cues (Hindi / Spanish / French / German) -code-switched
// injection is a real evasion technique.
const MULTILINGUAL_RE = /(अनदेखा करें|पिछले निर्देश|ignora las instrucciones|ignorez les instructions|anweisungen ignorieren)/i;

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

// Extract currency figures like ₹84,500 / Rs. 84500 / INR 84,500.00
function extractFigures(text) {
  const figures = [];
  const re = /(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    const value = Number(m[1].replace(/,/g, ''));
    if (!Number.isNaN(value)) figures.push({ raw: m[0].trim(), value });
  }
  return figures;
}

const FIELD_HINTS = [
  { field: 'total_amount', re: /\btotal\b|\bamount due\b|\bgrand total\b/i },
  { field: 'tax', re: /\b(gst|tax|vat)\b/i },
  { field: 'subtotal', re: /\bsub[- ]?total\b/i },
];

function classifyField(text, index) {
  const window = text.slice(Math.max(0, index - 40), index + 40);
  for (const hint of FIELD_HINTS) {
    if (hint.re.test(window)) return hint.field;
  }
  return 'line_item';
}

// ---------------------------------------------------------------------------
// The engine
// ---------------------------------------------------------------------------
export function evaluate({ type, text, filename, requestedAmount, confirmed }) {
  const timeline = [];
  const push = (event) => timeline.push({ ts: new Date().toISOString(), event });

  push('Document received');

  // 1. Content isolation -the raw document is untrusted, always.
  const docHash = sha256(text);
  push('Content isolated in untrusted store');

  // 2. Injection detection over the untrusted content.
  const injectionFindings = [];
  for (const p of INJECTION_PATTERNS) {
    if (p.re.test(text)) injectionFindings.push({ id: p.id, label: p.label });
  }
  const invisibleCount = (text.match(INVISIBLE_RE) || []).length;
  if (invisibleCount > 0) {
    injectionFindings.push({ id: 'invisible', label: `Hidden text: ${invisibleCount} invisible character(s)` });
  }
  if (MULTILINGUAL_RE.test(text)) {
    injectionFindings.push({ id: 'multilingual', label: 'Multilingual / code-switched override cue' });
  }
  // Mixed-script homoglyph obfuscation (Cyrillic/Greek lookalikes among Latin).
  if (/[\u0400-\u04FF\u0370-\u03FF]/.test(text) && /[a-z]/i.test(text)) {
    injectionFindings.push({ id: 'homoglyph', label: 'Mixed-script / homoglyph obfuscation' });
  }
  if (injectionFindings.length) push(`Injection detected (${injectionFindings.length} signal(s))`);

  // 3. Grounding -every figure the assistant might act on must trace to the
  // source document. We surface the evidence so it is independently checkable.
  const figures = extractFigures(text);
  const grounding = figures.map((f) => {
    const idx = text.indexOf(f.raw);
    const safeIdx = idx < 0 ? 0 : idx;
    return {
      value: f.raw,
      extractedValue: f.value,
      numeric: f.value,
      source: filename || `${type}_document.txt`,
      // Simulated page: one page per ~900 chars of the source document.
      page: 1 + Math.floor(safeIdx / 900),
      field: classifyField(text, safeIdx),
      offset: safeIdx,
      documentHash: docHash.slice(0, 16),
      verified: true,
    };
  });
  push('Grounding check complete');

  // The amount the assistant would act on: an explicitly requested amount must
  // itself be grounded in the document; otherwise we use the largest grounded
  // total we found.
  const groundedTotal = figures.length ? Math.max(...figures.map((f) => f.value)) : null;
  let actionableAmount = null;
  let amountGrounded = true;
  if (requestedAmount != null) {
    actionableAmount = Number(requestedAmount);
    amountGrounded = figures.some((f) => f.value === actionableAmount);
    if (!amountGrounded) push('Requested amount not found in source (grounding failure)');
  } else {
    actionableAmount = groundedTotal;
  }

  // 4. Deterministic policy. This is the authority boundary. The reasoning
  // array is the "refusal forensics" the UI renders step by step.
  const reasoning = [];
  let decision = 'execute';

  const untrusted = true; // documents are always untrusted input
  reasoning.push({ code: 'SRC', text: `Source is ${untrusted ? 'untrusted' : 'trusted'} (${type})`, pass: true });

  if (injectionFindings.length > 0) {
    reasoning.push({
      code: 'INJ',
      text: `Document attempted to issue ${injectionFindings.length} instruction/anomaly signal(s)`,
      pass: false,
    });
    decision = 'refuse';
  }

  if (requestedAmount != null && !amountGrounded) {
    reasoning.push({ code: 'GRD', text: 'Requested amount is not grounded in the source document', pass: false });
    if (decision !== 'refuse') decision = 'refuse';
  }

  if (actionableAmount != null) {
    const overLimit = actionableAmount >= config.autonomousLimitInr;
    reasoning.push({
      code: 'LMT',
      text: `Amount ₹${actionableAmount.toLocaleString('en-IN')} vs autonomous limit ₹${config.autonomousLimitInr.toLocaleString('en-IN')}`,
      pass: !overLimit,
    });
    if (overLimit && decision === 'execute') {
      decision = 'escalate';
    }
  }

  // Confirmation / 2FA gate for anything that would move money.
  if (decision === 'execute' && actionableAmount != null && actionableAmount > 0) {
    if (!confirmed) {
      reasoning.push({ code: 'CFM', text: 'User confirmation / 2FA is missing', pass: false });
      decision = 'escalate';
    } else {
      reasoning.push({ code: 'CFM', text: 'User confirmation satisfied', pass: true });
    }
  }

  // Ambiguity: nothing actionable but also nothing wrong.
  if (decision === 'execute' && actionableAmount == null) {
    reasoning.push({ code: 'AMB', text: 'No grounded monetary action found -nothing to execute', pass: true });
  }

  push(
    decision === 'execute'
      ? 'Action authorized and executed'
      : decision === 'refuse'
      ? 'Action rejected by policy'
      : 'Action escalated for human approval'
  );
  push('Audit entry committed');

  const summary =
    decision === 'execute'
      ? 'Grounded, policy-compliant, and within autonomous limits -executed.'
      : decision === 'refuse'
      ? 'Blocked: untrusted content attempted to drive an unauthorized action.'
      : 'Held for human approval: high value or missing confirmation.';

  return {
    decision,
    summary,
    reasoning,
    grounding,
    injectionFindings,
    actionableAmount,
    documentHash: docHash,
    timeline,
  };
}
