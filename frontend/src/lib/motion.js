// Shared Framer Motion presets. Everything uses custom cubic-bezier easing so
// nothing feels linear or default.
export const EASE = [0.22, 1, 0.36, 1];
export const EASE_SOFT = [0.65, 0, 0.35, 1];

// Reveal-on-scroll: fade + slight upward translate. Pair with `whileInView`
// and viewport={{ once: true }} for Intersection-Observer-driven reveals.
export const reveal = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE },
  },
};

// Container that staggers its children -used for grouped card grids.
export const stagger = (staggerChildren = 0.09, delayChildren = 0.05) => ({
  hidden: {},
  show: {
    transition: { staggerChildren, delayChildren },
  },
});

export const revealScale = {
  hidden: { opacity: 0, y: 24, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, ease: EASE } },
};

// Standard viewport config so reveals trigger a touch before fully in view.
export const inView = { once: true, margin: '-80px' };
