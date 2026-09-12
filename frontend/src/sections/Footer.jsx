import Reveal from '../components/Reveal.jsx';
import GlassButton from '../components/GlassButton.jsx';

export default function Footer() {
  return (
    <footer className="relative border-t border-white/8 px-6 pb-12 pt-20">
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
              <GlassButton as="a" href="https://github.com" target="_blank" rel="noreferrer" variant="ghost">
                View repository
              </GlassButton>
            </div>
          </div>
        </Reveal>

        {/* Footer meta */}
        <div className="mt-14 flex flex-col items-center justify-between gap-6 text-sm text-white/45 md:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="font-display text-base font-semibold text-white/80">Capita</span>
            <span className="text-white/30">· deterministic AI financial security</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <a href="#how" className="transition-colors hover:text-white">How it works</a>
            <a href="#attack-lab" className="transition-colors hover:text-white">Attack Lab</a>
            <a href="#security" className="transition-colors hover:text-white">Security</a>
            <a href="mailto:team@Capita.dev" className="transition-colors hover:text-white">Contact</a>
          </div>

          <div className="text-white/30">© {new Date().getFullYear()} Capita</div>
        </div>
      </div>
    </footer>
  );
}
