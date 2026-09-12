import { motion, useScroll, useTransform } from 'framer-motion';
import { usePrefersReducedMotion } from '../lib/useReducedMotion.js';

// Scroll-driven parallax backdrop. A few large, heavily-blurred "aurora" blobs
// move slower than the foreground as the page scrolls. Only three elements, so
// the cost stays low. Disabled entirely under prefers-reduced-motion.
export default function ParallaxBackground() {
  const reduced = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll();

  const y1 = useTransform(scrollYProgress, [0, 1], ['0%', '38%']);
  const y2 = useTransform(scrollYProgress, [0, 1], ['0%', '-24%']);
  const y3 = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);

  const Blob = reduced ? 'div' : motion.div;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-20 overflow-hidden">
      <Blob
        style={reduced ? undefined : { y: y1 }}
        className="absolute -left-40 top-[-10%] h-[42rem] w-[42rem] rounded-full opacity-40 blur-[120px]"
      >
        <div className="h-full w-full rounded-full bg-[radial-gradient(circle,rgba(63,111,224,0.55),transparent_60%)]" />
      </Blob>
      <Blob
        style={reduced ? undefined : { y: y2 }}
        className="absolute right-[-12rem] top-[28%] h-[38rem] w-[38rem] rounded-full opacity-35 blur-[130px]"
      >
        <div className="h-full w-full rounded-full bg-[radial-gradient(circle,rgba(143,186,255,0.45),transparent_60%)]" />
      </Blob>
      <Blob
        style={reduced ? undefined : { y: y3 }}
        className="absolute left-[30%] top-[70%] h-[34rem] w-[34rem] rounded-full opacity-30 blur-[140px]"
      >
        <div className="h-full w-full rounded-full bg-[radial-gradient(circle,rgba(201,184,255,0.4),transparent_60%)]" />
      </Blob>

      {/* Vignette to keep edges dark and text legible. */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_0%,transparent_40%,rgba(7,7,11,0.85))]" />
    </div>
  );
}
