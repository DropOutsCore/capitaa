import { useState } from 'react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { EASE } from '../lib/motion.js';
import GlassButton from './GlassButton.jsx';

const LINKS = [
  { href: '#how', label: 'How it works' },
  { href: '#demo', label: 'Trust Console' },
  { href: '#attack-lab', label: 'Attack Lab' },
  { href: '#proof', label: 'Privacy' },
  { href: '#audit', label: 'Audit Log' },
  { href: '#security', label: 'Security' },
];

export default function Navbar() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, 'change', (y) => {
    setScrolled(y > 40);
  });

  const navBg = { top: 'rgba(255,255,255,0.03)', scrolled: 'rgba(14,14,21,0.72)' };

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-4"
    >
      {/* Floating glass bar. It shrinks its padding and increases blur/opacity
          once the user scrolls past the hero. */}
      <motion.nav
        animate={{
          paddingTop: scrolled ? 8 : 14,
          paddingBottom: scrolled ? 8 : 14,
          marginTop: scrolled ? 10 : 18,
          width: scrolled ? '92%' : '100%',
          backgroundColor: scrolled ? navBg.scrolled : navBg.top,
          backdropFilter: scrolled ? 'blur(24px) saturate(160%)' : 'blur(10px)',
        }}
        transition={{ duration: 0.5, ease: EASE }}
        style={{ maxWidth: '80rem' }}
        className="flex items-center justify-between gap-6 rounded-2xl border border-white/10 px-4 shadow-glass md:px-6"
      >
        <a href="#top" className="flex items-center gap-2.5">
          <ShieldMark />
          <span className="font-display text-lg font-semibold tracking-tight">Capita</span>
        </a>

        <ul className="hidden items-center gap-7 text-sm text-white/60 lg:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="relative transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-white"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <GlassButton as="a" href="#demo" variant="primary" className="px-4 py-2 text-[13px]">
          Try the console
        </GlassButton>
      </motion.nav>
    </motion.header>
  );
}

function ShieldMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden>
      <defs>
        <linearGradient id="navg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8fbaff" />
          <stop offset="1" stopColor="#3f6fe0" />
        </linearGradient>
      </defs>
      <path
        d="M16 4l9 3.5v6.2c0 5.6-3.8 10.4-9 12.3-5.2-1.9-9-6.7-9-12.3V7.5L16 4z"
        stroke="url(#navg)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M11.5 16.2l3.2 3.2 6-6.6"
        stroke="url(#navg)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
