import { motion } from 'framer-motion';
import { EASE } from '../lib/motion.js';

// Glass-morphic button. Soft glow + scale on hover, satisfying press-down on
// tap. No jarring color-swaps -the fill barely shifts; the glow does the work.
export default function GlassButton({
  children,
  variant = 'primary',
  as = 'button',
  className = '',
  ...props
}) {
  const Comp = motion[as] || motion.button;

  const base =
    'group relative inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-medium tracking-tight select-none';

  const styles = {
    primary:
      'text-white border border-accent/40 bg-accent/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]',
    ghost:
      'text-white/80 border border-white/12 bg-white/[0.04] hover:text-white',
  };

  return (
    <Comp
      className={`${base} ${styles[variant]} ${className}`}
      style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      initial={false}
      whileHover={{ scale: 1.02, boxShadow: '0 10px 40px rgba(110,168,255,0.35)' }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.35, ease: EASE }}
      {...props}
    >
      {/* Soft inner glow that blooms on hover. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(120% 120% at 50% 0%, rgba(143,186,255,0.22), transparent 60%)',
        }}
      />
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </Comp>
  );
}
