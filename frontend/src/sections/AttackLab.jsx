import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Section from '../components/Section.jsx';
import Reveal from '../components/Reveal.jsx';
import GlassButton from '../components/GlassButton.jsx';
import DecisionBadge from '../components/DecisionBadge.jsx';
import { api } from '../lib/api.js';
import { EASE } from '../lib/motion.js';

// Result → tone. A defended outcome is GOOD (green/amber); an attack that got
// through is bad (red).
function resultTone(result) {
  if (result === 'ALLOWED') return { cls: 'text-signal-refuse border-signal-refuse/40 bg-signal-refuse/10', label: result };
  if (result === 'ESCALATED') return { cls: 'text-signal-escalate border-signal-escalate/40 bg-signal-escalate/10', label: result };
  return { cls: 'text-signal-execute border-signal-execute/40 bg-signal-execute/10', label: result }; // BLOCKED / DETECTED
}

const STEP_LABELS = ['Attack', 'Payload', 'Detection', 'Decision', 'Defense layer', 'Result'];

export default function AttackLab() {
  const [catalogue, setCatalogue] = useState(null);
  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.listAttacks().then(setCatalogue).catch((e) => setError(e.message));
  }, []);

  const categories = useMemo(() => {
    if (!catalogue) return ['All'];
    return ['All', ...catalogue.categories];
  }, [catalogue]);

  const items = useMemo(() => {
    if (!catalogue) return [];
    return filter === 'All' ? catalogue.items : catalogue.items.filter((a) => a.category === filter);
  }, [catalogue, filter]);

  async function run(attack) {
    setSelected(attack.id);
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const r = await api.runAttack(attack.id);
      setResult(r);
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <Section
      id="attack-lab"
      eyebrow="The Needle Attack Lab"
      title="Run real attacks. Watch them fail."
      intro="A reproducible suite of adversarial scenarios — each executed live against the real defenses. Pick an attack and see exactly how it's detected, decided, and which layer stops it."
    >
      {/* stats */}
      {catalogue && (
        <Reveal className="mb-6">
          <div className="glass flex flex-wrap items-center justify-center gap-x-8 gap-y-2 rounded-2xl px-6 py-3 text-sm text-white/60">
            <Stat n={catalogue.total} label="attacks" />
            <Stat n={catalogue.teamAuthored} label="team-authored" />
            <Stat n={catalogue.categories.length} label="categories" />
            <span className="text-white/40">Attack → Payload → Detection → Decision → Defense → Result</span>
          </div>
        </Reveal>
      )}

      {/* category filter */}
      <Reveal className="mb-6 flex flex-wrap justify-center gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              filter === c
                ? 'border-accent/50 bg-accent/15 text-white'
                : 'border-white/12 bg-white/[0.03] text-white/60 hover:text-white'
            }`}
          >
            {c}
          </button>
        ))}
      </Reveal>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* attack list */}
        <div className="lg:col-span-2">
          <div className="grid max-h-[560px] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-1">
            {items.map((a) => (
              <button
                key={a.id}
                onClick={() => run(a)}
                className={`glass group rounded-2xl p-4 text-left transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 ${
                  selected === a.id ? 'ring-1 ring-accent/60' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-display text-sm font-semibold text-white">{a.name}</span>
                  {a.author === 'team' && (
                    <span className="flex-none rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-accent">
                      Team
                    </span>
                  )}
                </div>
                <div className="mt-1 text-[11px] uppercase tracking-wide text-white/40">{a.category}</div>
                <p className="mt-2 line-clamp-2 font-mono text-[11px] leading-snug text-white/45">{a.payloadPreview}</p>
              </button>
            ))}
          </div>
        </div>

        {/* run detail */}
        <div className="lg:col-span-3">
          <div className="glass glass-edge sticky top-24 min-h-[560px] rounded-3xl p-6">
            <AnimatePresence mode="wait">
              {error ? (
                <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-signal-refuse">
                  {error}
                </motion.div>
              ) : running ? (
                <motion.div key="run" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid h-full place-items-center text-white/50">
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 animate-pulseglow rounded-full bg-accent" />
                    Executing attack against live defenses…
                  </div>
                </motion.div>
              ) : !result ? (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid h-full place-items-center text-center text-white/40">
                  <div>
                    <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.03]">
                      <BeakerIcon />
                    </div>
                    Select an attack to run it against the real backend.
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: EASE }}
                >
                  <FlowRow n="01" label="Attack">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-base font-semibold text-white">{result.name}</span>
                      <span className="text-xs text-white/40">{result.category}</span>
                    </div>
                  </FlowRow>

                  <FlowRow n="02" label="Payload">
                    <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded-xl border border-white/8 bg-ink-950/60 p-3 font-mono text-[11px] leading-relaxed text-white/70">
                      {result.payload}
                    </pre>
                  </FlowRow>

                  <FlowRow n="03" label="Detection">
                    <ul className="space-y-1">
                      {result.detection.map((d, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                          <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-accent" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </FlowRow>

                  <FlowRow n="04" label="Decision">
                    <DecisionBadge decision={result.decision} />
                  </FlowRow>

                  <FlowRow n="05" label="Defense layer">
                    <span className="text-sm text-white/70">{result.defenseLayer}</span>
                  </FlowRow>

                  <FlowRow n="06" label="Result" last>
                    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.14em] ${resultTone(result.result).cls}`}>
                      {resultTone(result.result).label}
                    </span>
                  </FlowRow>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </Section>
  );
}

function FlowRow({ n, label, children, last }) {
  return (
    <div className="relative flex gap-4 pb-5">
      {!last && <span className="absolute left-[15px] top-8 h-full w-px bg-white/10" />}
      <div className="flex-none">
        <span className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.04] font-mono text-[11px] text-white/50">
          {n}
        </span>
      </div>
      <div className="flex-1 pt-1">
        <div className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-white/40">{label}</div>
        {children}
      </div>
    </div>
  );
}

function Stat({ n, label }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="font-display text-lg font-semibold text-white">{n}</span>
      <span className="text-white/50">{label}</span>
    </span>
  );
}

function BeakerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-white/50">
      <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3" />
      <path d="M7 15h10" />
    </svg>
  );
}
