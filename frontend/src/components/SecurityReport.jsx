import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import GlassButton from './GlassButton.jsx';
import { api } from '../lib/api.js';
import { EASE } from '../lib/motion.js';

const LANGS = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'ta', name: 'தமிழ்' },
  { code: 'bn', name: 'বাংলা' },
  { code: 'mr', name: 'मराठी' },
  { code: 'fr', name: 'Français' },
  { code: 'es', name: 'Español' },
];

// Generates a multilingual security report for the current document by calling
// the real backend. The DECISION is computed by the deterministic engine; the
// LLM only translates the prose — so the outcome is identical in every language.
export default function SecurityReport({ doc }) {
  const [lang, setLang] = useState('en');
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function generate(code) {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        type: doc.type,
        text: doc.text,
        filename: doc.filename,
        ...(doc.requestedAmount != null ? { requestedAmount: doc.requestedAmount } : {}),
        confirmed: !!doc.confirmed,
        language: code,
      };
      const res = await api.generateReport(payload);
      setReport(res.report);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function onPickLang(code) {
    setLang(code);
    if (report) generate(code); // re-translate if a report is already shown
  }

  function downloadPdf() {
    if (!report) return;
    const r = report;
    const s = r.structured;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${r.labels.title}</title>
<style>
  body{font-family:'Segoe UI',system-ui,sans-serif;color:#111;max-width:720px;margin:40px auto;padding:0 24px;line-height:1.5}
  h1{font-size:22px;margin:0 0 4px} .sub{color:#666;font-size:12px;margin-bottom:24px}
  .badge{display:inline-block;padding:4px 12px;border-radius:999px;font-weight:600;font-size:13px}
  .refuse{background:#ffe3e9;color:#c01945} .execute{background:#dcfce7;color:#15803d} .escalate{background:#fef3c7;color:#b45309}
  .row{margin:14px 0} .label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#888;margin-bottom:2px}
  .val{font-size:15px} .note{margin-top:20px;padding:12px 16px;background:#f4f4f6;border-radius:10px;font-size:13px;color:#444}
  .meta{margin-top:28px;border-top:1px solid #e5e5e5;padding-top:14px;font-size:11px;color:#777;font-family:monospace}
</style></head><body>
  <h1>${r.labels.title}</h1>
  <div class="sub">CAPITA · The model proposes; policy decides · generated ${new Date(s.timestamp).toLocaleString()}</div>
  <div class="row"><div class="label">${r.labels.statusLabel}</div>
    <span class="badge ${s.decision.toLowerCase()}">${r.prose.securityStatus} · ${s.decision}</span></div>
  <div class="row"><div class="label">${r.labels.decisionLabel}</div><div class="val">${r.prose.capitaDecision}</div></div>
  <div class="row"><div class="label">${r.labels.threatLabel}</div><div class="val">${r.prose.threatExplanation}</div></div>
  <div class="row"><div class="label">${r.labels.recommendationLabel}</div><div class="val">${r.prose.recommendations}</div></div>
  <div class="note">${r.prose.note}</div>
  <div class="meta">
    Report ID: ${s.reportId || '—'}<br>
    Audit HMAC: ${s.auditHash || '—'}<br>
    Trust level: ${s.trustLevel} · Proposer: ${s.proposer || '—'} · Rendered by: ${r.engine}
  </div>
</body></html>`;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  }

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs uppercase tracking-[0.16em] text-white/40">Multilingual security report</span>
        <div className="flex flex-wrap gap-1.5">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => onPickLang(l.code)}
              className={`rounded-lg border px-2.5 py-1 text-xs transition-colors ${
                lang === l.code
                  ? 'border-accent/50 bg-accent/15 text-white'
                  : 'border-white/10 text-white/55 hover:text-white'
              }`}
            >
              {l.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <GlassButton onClick={() => generate(lang)} variant="primary" className="px-4 py-2 text-[13px]" disabled={busy}>
          {busy ? 'Generating…' : 'Generate report'}
        </GlassButton>
        {report && (
          <GlassButton onClick={downloadPdf} variant="ghost" className="px-4 py-2 text-[13px]">
            Download PDF
          </GlassButton>
        )}
      </div>

      <AnimatePresence mode="wait">
        {error ? (
          <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-sm text-signal-refuse">
            {error}
          </motion.div>
        ) : report ? (
          <motion.div
            key={report.language.code + report.engine}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="mt-4 rounded-xl border border-white/8 bg-ink-950/40 p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-display text-base font-semibold text-white">{report.labels.title}</h4>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${
                report.structured.decision === 'REFUSE' ? 'bg-signal-refuse/15 text-signal-refuse'
                : report.structured.decision === 'EXECUTE' ? 'bg-signal-execute/15 text-signal-execute'
                : 'bg-signal-escalate/15 text-signal-escalate'
              }`}>
                {report.structured.decision}
              </span>
            </div>
            <ReportRow label={report.labels.statusLabel} value={report.prose.securityStatus} />
            <ReportRow label={report.labels.decisionLabel} value={report.prose.capitaDecision} />
            <ReportRow label={report.labels.threatLabel} value={report.prose.threatExplanation} />
            <ReportRow label={report.labels.recommendationLabel} value={report.prose.recommendations} />
            <p className="mt-3 rounded-lg bg-white/[0.03] px-3 py-2 text-[12px] text-white/55">{report.prose.note}</p>
            <div className="mt-3 border-t border-white/8 pt-2 font-mono text-[10px] text-white/35">
              ID {report.structured.reportId?.slice(0, 8) || '—'} · HMAC {report.structured.auditHash || '—'} · rendered by {report.engine}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function ReportRow({ label, value }) {
  return (
    <div className="mb-2">
      <div className="text-[11px] uppercase tracking-[0.14em] text-white/35">{label}</div>
      <div className="text-sm text-white/80">{value}</div>
    </div>
  );
}
