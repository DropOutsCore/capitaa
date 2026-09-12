import { translateReport } from './llm/proposer.js';

// ---------------------------------------------------------------------------
// MULTILINGUAL SECURITY REPORT GENERATOR
//
// Turns an already-decided security result into a human-readable report, in the
// user's chosen language. The security OUTCOME (status/decision) is computed by
// the deterministic engine and passed through verbatim — the LLM only
// translates/formats the prose. If the LLM is unreachable, a deterministic
// per-language template is used so a report is always produced.
// ---------------------------------------------------------------------------

export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ta', name: 'Tamil' },
  { code: 'bn', name: 'Bengali' },
  { code: 'mr', name: 'Marathi' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
];

// Map the engine's decision → a user-facing status label + recommendations.
function statusFor(decision, injectionCount) {
  if (decision === 'refuse') {
    return {
      status: injectionCount > 0 ? 'Injection Detected' : 'Blocked by Policy',
      recommendations: ['Do not approve this payment', 'Report the document to your security team'],
    };
  }
  if (decision === 'escalate') {
    return {
      status: 'Needs Review',
      recommendations: ['Seek explicit human confirmation before proceeding', 'Verify the request through a trusted channel'],
    };
  }
  return {
    status: 'Safe',
    recommendations: ['Payment is within policy and may proceed', 'Retain this report for your audit records'],
  };
}

function decisionLabel(decision) {
  if (decision === 'refuse') return 'Block';
  if (decision === 'escalate') return 'Escalate';
  return 'Allow';
}

// Build the language-neutral English source fields from a decision result.
// `result` is the object returned by decisionEngine.evaluate(); `audit` is the
// committed audit entry (for metadata).
export function buildReportFields({ result, input, audit }) {
  const injectionCount = result.injectionFindings?.length || 0;
  const { status, recommendations } = statusFor(result.decision, injectionCount);

  const threats = injectionCount
    ? result.injectionFindings.map((f) => f.label)
    : ['No injection or evasion signals were detected in this document.'];

  const amount = result.actionableAmount != null ? `₹${Number(result.actionableAmount).toLocaleString('en-IN')}` : '—';

  // Reason: the first failing policy check, or a safe summary.
  const failing = (result.reasoning || []).find((r) => !r.pass);
  const reason = failing
    ? failing.text
    : 'Document is grounded, within policy, and authorized.';

  // These prose fields are what the LLM may translate.
  const prose = {
    documentSummary: `Document ${input.filename || input.type} · amount ${amount}`,
    securityStatus: status,
    threatExplanation: threats.join('; '),
    capitaDecision: `${decisionLabel(result.decision)} — ${reason}`,
    recommendations: recommendations.join(' · '),
    note: 'This document is treated as UNTRUSTED DATA and cannot authorize a payment on its own.',
  };

  // These structured fields are NEVER sent for LLM "judgement" — pass-through.
  const structured = {
    decision: result.decision.toUpperCase(),
    statusCode: status,
    reportId: audit?.eventId || null,
    timestamp: audit?.timestamp || new Date().toISOString(),
    auditHash: audit?.hmac ? audit.hmac.slice(0, 24) + '…' : null,
    trustLevel: 'UNTRUSTED SOURCE',
    proposer: null, // filled by the route
  };

  return { prose, structured };
}

// Deterministic fallback translations for the small set of prose labels, so a
// report is produced even when the LLM is unreachable. We translate the
// *status label* and a couple of fixed phrases; dynamic prose falls back to
// English with a clear notice.
const FALLBACK = {
  hi: {
    title: 'सुरक्षा रिपोर्ट',
    statusLabel: 'स्थिति',
    decisionLabel: 'CAPITA का निर्णय',
    reasonLabel: 'कारण',
    threatLabel: 'खतरे',
    recommendationLabel: 'सिफारिशें',
    note: 'यह दस्तावेज़ UNTRUSTED DATA है और स्वयं भुगतान का अधिकार नहीं रखता।',
    statusMap: { Safe: 'सुरक्षित', 'Injection Detected': 'इंजेक्शन का पता चला', 'Needs Review': 'समीक्षा आवश्यक', 'Blocked by Policy': 'नीति द्वारा अवरुद्ध' },
  },
  ta: {
    title: 'பாதுகாப்பு அறிக்கை',
    statusLabel: 'நிலை',
    decisionLabel: 'CAPITA முடிவு',
    reasonLabel: 'காரணம்',
    threatLabel: 'அச்சுறுத்தல்கள்',
    recommendationLabel: 'பரிந்துரைகள்',
    note: 'இந்த ஆவணம் UNTRUSTED DATA ஆகும், தானாகப் பணம் அங்கீகரிக்க முடியாது.',
    statusMap: { Safe: 'பாதுகாப்பானது', 'Injection Detected': 'ஊடுருவல் கண்டறியப்பட்டது', 'Needs Review': 'மறுஆய்வு தேவை', 'Blocked by Policy': 'கொள்கையால் தடுக்கப்பட்டது' },
  },
  bn: {
    title: 'নিরাপত্তা প্রতিবেদন',
    statusLabel: 'অবস্থা',
    decisionLabel: 'CAPITA সিদ্ধান্ত',
    reasonLabel: 'কারণ',
    threatLabel: 'হুমকি',
    recommendationLabel: 'সুপারিশ',
    note: 'এই নথিটি UNTRUSTED DATA এবং নিজে থেকে অর্থপ্রদানের অনুমোদন দিতে পারে না।',
    statusMap: { Safe: 'নিরাপদ', 'Injection Detected': 'ইনজেকশন সনাক্ত হয়েছে', 'Needs Review': 'পর্যালোচনা প্রয়োজন', 'Blocked by Policy': 'নীতি দ্বারা অবরুদ্ধ' },
  },
  mr: {
    title: 'सुरक्षा अहवाल',
    statusLabel: 'स्थिती',
    decisionLabel: 'CAPITA निर्णय',
    reasonLabel: 'कारण',
    threatLabel: 'धोके',
    recommendationLabel: 'शिफारसी',
    note: 'हे दस्तऐवज UNTRUSTED DATA आहे आणि स्वतःहून पेमेंटला अधिकृत करू शकत नाही.',
    statusMap: { Safe: 'सुरक्षित', 'Injection Detected': 'इंजेक्शन आढळले', 'Needs Review': 'पुनरावलोकन आवश्यक', 'Blocked by Policy': 'धोरणाने अवरोधित' },
  },
  fr: {
    title: 'Rapport de sécurité',
    statusLabel: 'Statut',
    decisionLabel: 'Décision CAPITA',
    reasonLabel: 'Raison',
    threatLabel: 'Menaces',
    recommendationLabel: 'Recommandations',
    note: "Ce document est traité comme des DONNÉES NON FIABLES (UNTRUSTED DATA) et ne peut pas autoriser un paiement.",
    statusMap: { Safe: 'Sûr', 'Injection Detected': 'Injection détectée', 'Needs Review': 'Révision requise', 'Blocked by Policy': 'Bloqué par la politique' },
  },
  es: {
    title: 'Informe de seguridad',
    statusLabel: 'Estado',
    decisionLabel: 'Decisión de CAPITA',
    reasonLabel: 'Motivo',
    threatLabel: 'Amenazas',
    recommendationLabel: 'Recomendaciones',
    note: 'Este documento se trata como DATOS NO CONFIABLES (UNTRUSTED DATA) y no puede autorizar un pago.',
    statusMap: { Safe: 'Seguro', 'Injection Detected': 'Inyección detectada', 'Needs Review': 'Requiere revisión', 'Blocked by Policy': 'Bloqueado por la política' },
  },
};

// English label set (also used as the base for LLM-translated reports).
const EN_LABELS = {
  title: 'Security Report',
  statusLabel: 'Status',
  decisionLabel: 'CAPITA Decision',
  reasonLabel: 'Reason',
  threatLabel: 'Threats',
  recommendationLabel: 'Recommendations',
};

// Produce the final localized report. `engine` reports how it was produced.
export async function generateReport({ result, input, audit, languageCode }) {
  const lang = LANGUAGES.find((l) => l.code === languageCode) || LANGUAGES[0];
  const { prose, structured } = buildReportFields({ result, input, audit });

  // English: no translation needed.
  if (lang.code === 'en') {
    return { language: lang, labels: EN_LABELS, prose, structured, engine: 'source (English)' };
  }

  // Try the LLM translator first.
  const { fields: translatedProse, engine } = await translateReport(prose, lang.name, lang.code);
  if (translatedProse) {
    // Labels: use the deterministic fallback label set for this language when
    // available (crisp, correct headings), else English.
    const fb = FALLBACK[lang.code];
    const labels = fb
      ? { title: fb.title, statusLabel: fb.statusLabel, decisionLabel: fb.decisionLabel, reasonLabel: fb.reasonLabel, threatLabel: fb.threatLabel, recommendationLabel: fb.recommendationLabel }
      : EN_LABELS;
    return { language: lang, labels, prose: translatedProse, structured, engine };
  }

  // Deterministic fallback: localized labels + localized status, English prose
  // for the dynamic parts, with a clear notice.
  const fb = FALLBACK[lang.code];
  if (fb) {
    const localizedProse = {
      ...prose,
      securityStatus: fb.statusMap[prose.securityStatus] || prose.securityStatus,
      note: fb.note,
    };
    return {
      language: lang,
      labels: { title: fb.title, statusLabel: fb.statusLabel, decisionLabel: fb.decisionLabel, reasonLabel: fb.reasonLabel, threatLabel: fb.threatLabel, recommendationLabel: fb.recommendationLabel },
      prose: localizedProse,
      structured,
      engine: 'deterministic fallback (translator offline)',
    };
  }

  // No fallback for this language — return English with a notice.
  return { language: lang, labels: EN_LABELS, prose, structured, engine: 'English (no translation available)' };
}
