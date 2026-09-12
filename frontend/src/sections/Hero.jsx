import { Suspense, lazy } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { EASE } from '../lib/motion.js';
import { usePrefersReducedMotion } from '../lib/useReducedMotion.js';
import GlassButton from '../components/GlassButton.jsx';

// The 3D canvas is code-split so it never blocks first paint.
const HeroVisual = lazy(() => import('../components/HeroVisual.jsx'));

export default function Hero() {
  const reduced = usePrefersReducedMotion();
  const { scrollY } = useScroll();

  // Foreground copy drifts up faster than the background as you scroll.
  const copyY = useTransform(scrollY, [0, 600], [0, -80]);
  const visualY = useTransform(scrollY, [0, 600], [0, -30]);
  const fade = useTransform(scrollY, [0, 500], [1, 0]);

  return (
    <section id="top" className="relative flex min-h-[100svh] items-center overflow-hidden">
      <div className="relative mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-6 pt-32 pb-20 lg:grid-cols-2 lg:pt-24">
        {/* Left: copy */}
        <motion.div style={reduced ? undefined : { y: copyY, opacity: fade }}>
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="eyebrow"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulseglow" />
            AI financial assistant · security-first
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.08 }}
            className="mt-6 font-display text-5xl font-semibold leading-[1.02] tracking-tightest text-gradient sm:text-6xl lg:text-7xl"
          >
            The model proposes.
            <br />
            <span className="text-accent-gradient">Policy decides.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.18 }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-white/60"
          >
            Capita treats the language model as untrusted. Every financial action is grounded in
            source evidence, checked against deterministic policy, and written to a tamper-evident
            ledger -so a poisoned invoice can never move your money.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.28 }}
            className="mt-9 flex flex-wrap items-center gap-4"
          >
            <GlassButton as="a" href="#demo" variant="primary" className="px-7 py-3.5 text-base">
              Try the live console
              <Arrow />
            </GlassButton>
            <GlassButton as="a" href="#how" variant="ghost" className="px-7 py-3.5 text-base">
              See how it works
            </GlassButton>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, ease: EASE, delay: 0.5 }}
            className="mt-10 flex items-center gap-6 text-xs text-white/40"
          >
            <span className="flex items-center gap-2">
              <Dot /> Grounded evidence
            </span>
            <span className="flex items-center gap-2">
              <Dot /> Deterministic refusal
            </span>
            <span className="flex items-center gap-2">
              <Dot /> Hash-chained audit
            </span>
          </motion.div>
        </motion.div>

        {/* Right: 3D visual (or a calm static orb under reduced motion) */}
        <motion.div
          style={reduced ? undefined : { y: visualY }}
          className="relative mx-auto aspect-square w-full max-w-[34rem]"
        >
          {reduced ? (
            <StaticOrb />
          ) : (
            <div className="absolute inset-0">
              <div className="absolute inset-6 rounded-full bg-accent/20 blur-[80px]" />
              <Suspense fallback={<StaticOrb />}>
                <HeroVisual />
              </Suspense>
            </div>
          )}
        </motion.div>
      </div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/30"
      >
        <div className="flex h-9 w-6 justify-center rounded-full border border-white/15 p-1">
          <motion.span
            animate={reduced ? {} : { y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            className="h-2 w-1 rounded-full bg-white/40"
          />
        </div>
      </motion.div>
    </section>
  );
}

function StaticOrb() {
  // Static shield used as the reduced-motion / loading fallback so the hero
  // stays on-theme (and matches the 3D shield) without any animation cost.
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="relative h-72 w-72">
        <div className="absolute inset-6 rounded-full bg-accent/20 blur-[70px]" />
        <svg viewBox="0 0 32 32" fill="none" className="relative h-full w-full drop-shadow-[0_12px_40px_rgba(110,168,255,0.35)]">
          <defs>
            <linearGradient id="heroShield" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#8fbaff" />
              <stop offset="1" stopColor="#3f6fe0" />
            </linearGradient>
          </defs>
          <path
            d="M16 3l10 3.8v6.9c0 6.2-4.2 11.6-10 13.6-5.8-2-10-7.4-10-13.6V6.8L16 3z"
            fill="url(#heroShield)"
            fillOpacity="0.16"
            stroke="url(#heroShield)"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <path
            d="M11 16.2l3.4 3.4 6.4-7"
            fill="none"
            stroke="#eaf2ff"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Dot() {
  return <span className="h-1 w-1 rounded-full bg-accent" />;
}
