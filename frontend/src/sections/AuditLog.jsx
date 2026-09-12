import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Section from '../components/Section.jsx';
import Reveal from '../components/Reveal.jsx';
import GlassButton from '../components/GlassButton.jsx';
import { api } from '../lib/api.js';
import { EASE } from '../lib/motion.js';

// Colour per event type so the log reads at a glance.
const EVENT_TONE = {
  DOCUMENT_UPLOADED: 'text-accent',
  INJECTION_DETECTED: 'text-signal-refuse',
  DECISION_EXECUTE: 'text-signal-execute',
  DECISION_REFUSE: 'text-signal-refuse',
  DECISION_ESCALATE: 'text-signal-escalate',
  ATTACK_SIMULATED: 'text-signal-escalate',
  PROOF_GENERATED: 'text-accent',
};

export default function AuditLog() {
  const [entries, setEntries] = useState([]);
  const [integrity, setIntegrity] = useState(null);
  const [truncation, setTruncation] = useState(null);
  const [busy, setBusy] = useState(false);

  function apply(data) {
    setEntries(data.entries || []);
    setIntegrity(data.integrity || null);
    setTruncation(data.truncation || null);
  }

  async function load() {
    apply(await api.getLog());
  }

  // Ensure there's always something to show: seed if the log is empty.
  useEffect(() => {
    (async () => {
      try {
        const data = await api.getLog();
        if (!data.entries || data.entries.length === 0) apply(await api.seedLog());
        else apply(data);
      } catch {
        /* backend offline */
      }
    })();
  }, []);

  async function reseed() {
    setBusy(true);
    try {
      apply(await api.seedLog());
      await load(); // refresh truncation check against the fresh checkpoint
    } finally {
      setBusy(false);
    }
  }

  // Tamper with a middle entry to prove the chain breaks from that point.
  async function tamper() {
    setBusy(true);
    try {
      const idx = Math.min(2, Math.max(0, entries.length - 2));
      await api.tamperLog(idx, 'PAYLOAD_TAMPERED — action altered by attacker');
      await load();
    } finally {
      setBusy(false);
    }
  }

  // Delete the last entry — the hash chain stays VALID, but the append-only
  // checkpoint catches the missing entry.
  async function truncate() {
    setBusy(true);
    try {
      apply(await api.truncateLog());
    } finally {
      setBusy(false);
    }
  }

  const brokenAt = integrity && !integrity.intact ? integrity.brokenAt : -1;
  const truncated = truncation && truncation.status === 'TRUNCATION_DETECTED';

  return (
    <Section
      id="audit"
      eyebrow="Tamper-evident audit log"
      title="Every action, hash-chained"
      intro="A verifiable history of every important action in Capita — document uploads, injection detection, security decisions, attack simulations, proof generation. Each event is linked with HMAC-SHA256, so any modification, insertion, deletion, or reordering breaks the chain and is detected."
    >
      {/* integrity banner + controls */}
      <Reveal className="mb-6">
        <div className="glass flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-3">
          <div className="flex items-center gap-3 text-sm">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                integrity?.intact && !truncated ? 'bg-signal-execute animate-pulseglow' : 'bg-signal-refuse'
              }`}
            />
            {!integrity ? (
              <span className="text-white/40">Loading…</span>
            ) : !integrity.intact ? (
              <span className="font-semibold text-signal-refuse">
                HASH CHAIN BROKEN at #{brokenAt} — LOG INTEGRITY FAILURE ({integrity.reason})
              </span>
            ) : truncated ? (
              <span className="font-semibold text-signal-refuse">
                ENTRY COUNT MISMATCH — {truncation.missing || 'tail'} {truncation.missing === 1 ? 'entry' : 'entries'} missing from checkpoint
                <span className="ml-2 font-normal text-white/40">
                  (chain still internally VALID — caught by the checkpoint)
                </span>
              </span>
            ) : (
              <span className="text-white/70">
                Chain intact · {entries.length} events · checkpoint OK ·{' '}
                <span className="text-white/40">HMAC-SHA256 + append-only checkpoint</span>
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <GlassButton onClick={tamper} variant="ghost" disabled={busy}>
              Simulate tampering
            </GlassButton>
            <GlassButton onClick={truncate} variant="ghost" disabled={busy}>
              Simulate truncation
            </GlassButton>
            <GlassButton onClick={reseed} variant="primary" disabled={busy}>
              Reset chain
            </GlassButton>
          </div>
        </div>
      </Reveal>

      {/* the chain */}
      <Reveal>
        <div className="glass glass-edge overflow-hidden rounded-3xl">
          {/* header row */}
          <div className="hidden grid-cols-12 gap-2 border-b border-white/10 px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-white/40 md:grid">
            <div className="col-span-2">Timestamp</div>
            <div className="col-span-2">Actor</div>
            <div className="col-span-4">Action</div>
            <div className="col-span-2">Payload hash</div>
            <div className="col-span-2">HMAC</div>
          </div>

          <div className="divide-y divide-white/5">
            <AnimatePresence initial={false}>
              {entries.map((e, i) => {
                const broken = brokenAt !== -1 && i >= brokenAt;
                return (
                  <motion.div
                    key={e.eventId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: EASE, delay: i * 0.02 }}
                    className={`grid grid-cols-1 gap-2 px-5 py-3 text-[13px] md:grid-cols-12 ${
                      broken ? 'bg-signal-refuse/[0.06]' : ''
                    }`}
                  >
                    <div className="col-span-2 font-mono text-[11px] text-white/45">
                      {new Date(e.timestamp).toLocaleTimeString('en-GB')}
                    </div>
                    <div className="col-span-2 text-white/60">{e.actor}</div>
                    <div className="col-span-4">
                      <span className={`mr-2 font-mono text-[10px] ${EVENT_TONE[e.event] || 'text-white/40'}`}>
                        {e.event}
                      </span>
                      <span className="text-white/80">{e.action}</span>
                    </div>
                    <div className="col-span-2 font-mono text-[10px] text-white/40">
                      {e.payloadHash.slice(0, 10)}…
                    </div>
                    <div className="col-span-2 flex items-center gap-2 font-mono text-[10px]">
                      <span className={broken ? 'text-signal-refuse line-through' : 'text-accent/70'}>
                        {e.hmac.slice(0, 10)}…
                      </span>
                      {broken && (
                        <span className="rounded bg-signal-refuse/15 px-1.5 py-0.5 text-[9px] font-semibold text-signal-refuse">
                          {i === brokenAt ? 'BROKEN' : 'INVALID'}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </Reveal>

      <Reveal className="mt-6">
        <p className="mx-auto max-w-3xl text-center text-xs leading-relaxed text-white/40">
          Each event's HMAC covers the previous event's HMAC, so edits/insertions cascade to every entry after them.
          Deletion of the newest entry can't be seen by the chain alone (the survivors stay consistent), so it's caught
          by cross-referencing an <span className="text-white/55">append-only external checkpoint</span> against the live
          entry count. Tamper-evident, not tamper-proof: an attacker with write access to both the log and the
          co-located checkpoint could still defeat it — a production build would push checkpoints to a separate host or
          a WORM/transparency log.
        </p>
      </Reveal>
    </Section>
  );
}
