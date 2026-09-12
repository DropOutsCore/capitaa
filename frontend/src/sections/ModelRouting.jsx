import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Section from '../components/Section.jsx';
import Reveal from '../components/Reveal.jsx';
import GlassButton from '../components/GlassButton.jsx';
import { api } from '../lib/api.js';
import { EASE } from '../lib/motion.js';

const STATUS_TONE = {
  active: 'text-signal-execute border-signal-execute/40 bg-signal-execute/10',
  standby: 'text-signal-escalate border-signal-escalate/40 bg-signal-escalate/10',
  ready: 'text-accent border-accent/40 bg-accent/10',
  down: 'text-signal-refuse border-signal-refuse/40 bg-signal-refuse/10',
};

export default function ModelRouting() {
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.modelsStatus().then(setState).catch(() => {});
  useEffect(() => { load(); }, []);

  async function fail() {
    setBusy(true);
    try { setState(await api.simulateFailure()); } finally { setBusy(false); }
  }
  async function reset() {
    setBusy(true);
    try { setState(await api.resetModels()); } finally { setBusy(false); }
  }

  return (
    <Section
      id="failover"
      eyebrow="Model failover"
      title="The proposer can fail. The guarantees can't."
      intro="The model is just an untrusted proposer. Knock out a provider and routing falls through to the next tier automatically — while grounding, typed actions, deterministic policy, and proof verification stay enforced, unchanged."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* routing tiers */}
        <Reveal className="lg:col-span-2">
          <div className="glass glass-edge h-full rounded-3xl p-6">
            <div className="mb-5 flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.16em] text-white/40">Routing</span>
              {state?.degraded && (
                <span className="rounded-full border border-signal-escalate/40 bg-signal-escalate/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-signal-escalate">
                  Degraded — controls intact
                </span>
              )}
            </div>

            <div className="space-y-3">
              {state?.tiers.map((t, i) => (
                <motion.div
                  key={t.tier}
                  layout
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
                    t.active ? 'border-accent/40 bg-accent/[0.06]' : 'border-white/10 bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-white/35">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-sm font-medium text-white/85">{t.label}</span>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${STATUS_TONE[t.status] || STATUS_TONE.ready}`}>
                    {t.status}
                  </span>
                </motion.div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <GlassButton onClick={fail} variant="primary" disabled={busy}>
                Simulate provider failure
              </GlassButton>
              <GlassButton onClick={reset} variant="ghost" disabled={busy}>
                Reset
              </GlassButton>
            </div>
            {state && (
              <p className="mt-4 text-sm text-white/50">
                Active proposer: <span className="text-white/80">{state.activeLabel}</span>
              </p>
            )}
          </div>
        </Reveal>

        {/* invariant safety layer */}
        <Reveal>
          <div className="glass h-full rounded-3xl p-6">
            <div className="mb-5 text-xs uppercase tracking-[0.16em] text-white/40">Safety layer (always on)</div>
            <ul className="space-y-3">
              {state?.safetyLayer.map((s) => (
                <li key={s.key} className="flex items-center gap-3">
                  <span className="grid h-6 w-6 flex-none place-items-center rounded-md bg-signal-execute/15 text-signal-execute">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </span>
                  <span className="text-sm text-white/75">{s.label}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-[11px] leading-relaxed text-white/40">
              These controls live outside the model. Failover changes who proposes — never what is allowed.
            </p>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
