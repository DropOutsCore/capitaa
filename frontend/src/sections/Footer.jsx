import { useState } from 'react';
import Reveal from '../components/Reveal.jsx';
import GlassButton from '../components/GlassButton.jsx';
import GovernanceModal from '../components/GovernanceModal.jsx';

const REPO = 'https://github.com/DropOutsCore/capitaa';

export default function Footer() {
  const [doc, setDoc] = useState(null); // 'security' | 'compliance' | 'terms'
  return (
    <footer className="relative overflow-hidden border-t border-white/8 px-6 pb-12 pt-20">
      <div className="mx-auto max-w-7xl">
        {/* CTA band */}
        <Reveal>
          <div className="glass-strong glass-edge relative overflow-hidden rounded-4xl px-8 py-14 text-center">
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_120%_at_50%_0%,rgba(110,168,255,0.18),transparent_70%)]" />
            <h2 className="mx-auto max-w-2xl font-display text-3xl font-semibold tracking-tightest text-gradient md:text-4xl">
              Give the model a voice, not a vault key.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/55">
              Try the live console, read the code, or get in touch. Everything you saw above is served
              by the running backend.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <GlassButton as="a" href="#demo" variant="primary">Open the console</GlassButton>
              <GlassButton as="a" href={REPO} target="_blank" rel="noreferrer" variant="ghost">
                View repository
              </GlassButton>
            </div>
          </div>
        </Reveal>

        {/* Trust & legal — governance docs, readable in-app */}
        <Reveal className="mt-10">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <GovCard
              onClick={() => setDoc('security')}
              icon={<ShieldIcon />}
              title="Security & Trust"
              desc="Threat model, controls, responsible disclosure, and our accepted weakness — stated plainly."
              tag="SECURITY.md"
            />
            <GovCard
              onClick={() => setDoc('compliance')}
              icon={<ScaleIcon />}
              title="Compliance Mapping"
              desc="Honest status against RBI outsourcing, payment-security, and data-localization guidelines."
              tag="COMPLIANCE_MAPPING.md"
            />
            <GovCard
              onClick={() => setDoc('terms')}
              icon={<DocIcon />}
              title="Terms of Use"
              desc="Scope of authority, the human-in-the-loop guarantee, and your independent audit rights."
              tag="TERMS_OF_USE.md"
            />
          </div>
        </Reveal>

        {/* Giant edge-to-edge wordmark — the closing signature (full-bleed) */}
        <Reveal className="mt-16 overflow-hidden">
          <div
            aria-hidden
            className="select-none whitespace-nowrap text-center font-display font-semibold tracking-tightest text-transparent bg-clip-text"
            style={{
              fontSize: 'clamp(4.5rem, 26vw, 26rem)',
              lineHeight: 1.15,
              paddingBottom: '0.08em',
              backgroundImage: 'linear-gradient(180deg, #8fbaff 0%, #5b8def 45%, #3f6fe0 100%)',
              filter: 'drop-shadow(0 8px 60px rgba(110,168,255,0.28))',
            }}
          >
            Capita
          </div>
        </Reveal>

        {/* Footer meta */}
        <div className="mt-8 flex flex-col items-center justify-between gap-6 text-sm text-white/45 md:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="font-display text-base font-semibold text-white/80">Capita</span>
            <span className="text-white/30">· deterministic AI financial security</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <a href="#attack-lab" className="transition-colors hover:text-white">Attack Lab</a>
            <button onClick={() => setDoc('security')} className="transition-colors hover:text-white">Security</button>
            <button onClick={() => setDoc('compliance')} className="transition-colors hover:text-white">Compliance</button>
            <button onClick={() => setDoc('terms')} className="transition-colors hover:text-white">Terms</button>
            <a href="mailto:team@Capita.dev" className="transition-colors hover:text-white">Contact</a>
          </div>

          <div className="text-white/30">© {new Date().getFullYear()} Capita</div>
        </div>
      </div>

      <GovernanceModal docKey={doc} onClose={() => setDoc(null)} />
    </footer>
  );
}

function GovCard({ onClick, icon, title, desc, tag }) {
  return (
    <button
      onClick={onClick}
      className="glass group h-full rounded-2xl p-5 text-left transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-accent/10 text-accent">
          {icon}
        </span>
        <span className="font-mono text-[10px] text-white/30">{tag}</span>
      </div>
      <h3 className="font-display text-base font-semibold text-white">{title}</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-white/55">{desc}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-xs text-accent/80 transition-colors group-hover:text-accent">
        Read <Arrow />
      </span>
    </button>
  );
}

function iconBase(props) {
  return { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', ...props };
}
function ShieldIcon() { return <svg {...iconBase()}><path d="M12 3l7 2.5v5c0 4.5-3 8.4-7 9.5-4-1.1-7-5-7-9.5v-5L12 3z" /><path d="M9 12l2 2 4-4.5" /></svg>; }
function ScaleIcon() { return <svg {...iconBase()}><path d="M12 3v18M5 7h14M7 7l-3 6a3 3 0 0 0 6 0zM17 7l-3 6a3 3 0 0 0 6 0zM8 21h8" /></svg>; }
function DocIcon() { return <svg {...iconBase()}><path d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M14 3v4h4M9 13h6M9 17h6" /></svg>; }
function Arrow() { return <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
