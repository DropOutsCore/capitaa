import Section from '../components/Section.jsx';
import Reveal from '../components/Reveal.jsx';

const STEPS = [
  {
    n: '01',
    title: 'Typed action layer',
    body: 'The model can never call a payment API directly. It may only emit a typed, schema-validated action proposal -a structured intent, not an executable command.',
    icon: TypeIcon,
  },
  {
    n: '02',
    title: 'Grounding check',
    body: 'Every figure in the proposal must trace back to a field in the source document -value, page, and hash. Anything ungrounded is rejected before policy even runs.',
    icon: AnchorIcon,
  },
  {
    n: '03',
    title: 'Deterministic refusal policy',
    body: 'A fixed rule engine -not the model -decides. Limits, authority, confirmation, and injection signals produce one of three outcomes: execute, refuse, or escalate.',
    icon: GavelIcon,
  },
  {
    n: '04',
    title: 'Tamper-evident log',
    body: 'The decision is committed to a hash-chained ledger. Each entry commits to the previous one, so any retroactive edit breaks the chain and is detected instantly.',
    icon: ChainIcon,
  },
];

export default function HowItWorks() {
  return (
    <Section
      id="how"
      eyebrow="How it works"
      title="Four layers between a document and your money"
      intro="The pipeline is designed so financial authority never touches the model. Each stage can only ever make the system safer, never override the one before it."
    >
      <Reveal group className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <Reveal.Item key={s.n}>
            <div className="glass glass-edge group relative h-full rounded-3xl p-6 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1.5">
              <div className="flex items-center justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-accent/10 text-accent">
                  <s.icon />
                </span>
                <span className="font-display text-2xl font-semibold text-white/15">{s.n}</span>
              </div>
              <h3 className="mt-6 font-display text-lg font-semibold tracking-tight text-white">
                {s.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-white/55">{s.body}</p>

              {/* connecting arrow between cards on large screens */}
              {i < STEPS.length - 1 && (
                <span className="pointer-events-none absolute -right-3 top-1/2 hidden -translate-y-1/2 text-white/20 lg:block">
                  <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              )}
            </div>
          </Reveal.Item>
        ))}
      </Reveal>

      <Reveal className="mt-8">
        <div className="glass rounded-3xl px-6 py-5 text-center text-sm text-white/50">
          Core principle —{' '}
          <span className="text-white/80">the model proposes, deterministic policy decides.</span>{' '}
          The LLM is treated as an untrusted reasoning component.
        </div>
      </Reveal>
    </Section>
  );
}

/* -inline icons, stroked to match the accent line language -*/
function base(props) {
  return { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', ...props };
}
function TypeIcon() { return <svg {...base()}><path d="M4 7V5h16v2M9 5v14M15 5v14M7 19h4M13 19h4" /></svg>; }
function AnchorIcon() { return <svg {...base()}><circle cx="12" cy="5" r="2" /><path d="M12 7v13M5 12H3a9 9 0 0 0 18 0h-2" /></svg>; }
function GavelIcon() { return <svg {...base()}><path d="M14 3l7 7-3 3-7-7zM11 8l-8 8 3 3 8-8M3 21h8" /></svg>; }
function ChainIcon() { return <svg {...base()}><path d="M9 12h6M8.5 8H7a4 4 0 0 0 0 8h1.5M15.5 8H17a4 4 0 0 1 0 8h-1.5" /></svg>; }
