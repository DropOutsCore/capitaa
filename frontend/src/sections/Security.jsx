import Section from '../components/Section.jsx';
import Reveal from '../components/Reveal.jsx';

const ATTACKS = [
  { name: 'Invoice prompt injection', defense: 'Instruction isolation + refusal policy', tag: 'Injection' },
  { name: 'Malicious supplier email', defense: 'Untrusted-source flag, no autonomous authority', tag: 'Injection' },
  { name: 'Invisible / zero-width text', defense: 'Unicode normalization + hidden-char scan', tag: 'Evasion' },
  { name: 'Beneficiary-swap request', defense: 'Bank-detail change requires human approval', tag: 'Fraud' },
  { name: 'Fake authority claim', defense: 'Authority is verified out-of-band, never trusted', tag: 'Social' },
  { name: 'Multilingual / code-switched', defense: 'Cross-language override detection', tag: 'Evasion' },
  { name: 'Urgency / pressure framing', defense: 'Deterministic limits ignore urgency', tag: 'Social' },
  { name: 'Ungrounded figure', defense: 'Every amount must trace to a source field', tag: 'Grounding' },
  { name: 'Over-limit autonomous payment', defense: 'Hard ceiling forces escalation', tag: 'Policy' },
  { name: 'Audit-log tampering', defense: 'Hash chain detects any retroactive edit', tag: 'Integrity' },
];

const TAG_COLOR = {
  Injection: 'text-signal-refuse border-signal-refuse/30 bg-signal-refuse/10',
  Evasion: 'text-accent border-accent/30 bg-accent/10',
  Fraud: 'text-signal-escalate border-signal-escalate/30 bg-signal-escalate/10',
  Social: 'text-signal-escalate border-signal-escalate/30 bg-signal-escalate/10',
  Grounding: 'text-signal-execute border-signal-execute/30 bg-signal-execute/10',
  Policy: 'text-accent border-accent/30 bg-accent/10',
  Integrity: 'text-signal-execute border-signal-execute/30 bg-signal-execute/10',
};

export default function Security() {
  return (
    <Section
      id="security"
      eyebrow="Threat coverage"
      title="Attacks we defend against"
      intro="Because this is a security product, the defenses are explicit. Each attack maps to a specific, deterministic control -not a hope that the model behaves."
    >
      <Reveal group className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ATTACKS.map((a) => (
          <Reveal.Item key={a.name}>
            <div className="glass group h-full rounded-2xl p-5 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-base font-semibold tracking-tight text-white">{a.name}</h3>
                <span className={`flex-none rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${TAG_COLOR[a.tag]}`}>
                  {a.tag}
                </span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-white/55">
                <ShieldTick />
                <span>{a.defense}</span>
              </div>
            </div>
          </Reveal.Item>
        ))}
      </Reveal>

      <Reveal className="mt-8">
        <div className="glass rounded-3xl px-6 py-5 text-center text-sm text-white/50">
          We don’t claim perfect security. We claim a system where the{' '}
          <span className="text-white/80">blast radius of a compromised model is bounded</span> by
          deterministic controls it cannot override.
        </div>
      </Reveal>
    </Section>
  );
}

function ShieldTick() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flex-none text-signal-execute">
      <path d="M12 3l7 2.5v5c0 4.5-3 8.4-7 9.5-4-1.1-7-5-7-9.5v-5L12 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
