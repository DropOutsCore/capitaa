import { motion } from 'framer-motion';
import { reveal, stagger, inView } from '../lib/motion.js';

// Intersection-Observer-driven reveal (Framer Motion's whileInView uses IO
// under the hood). Wrap a group in <Reveal group> and children in
// <Reveal.Item> to get staggered entrance.
export default function Reveal({ children, className = '', group = false, delay = 0, ...props }) {
  if (group) {
    return (
      <motion.div
        className={className}
        variants={stagger()}
        initial="hidden"
        whileInView="show"
        viewport={inView}
        {...props}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={className}
      variants={reveal}
      initial="hidden"
      whileInView="show"
      viewport={inView}
      transition={{ delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

Reveal.Item = function RevealItem({ children, className = '', ...props }) {
  return (
    <motion.div className={className} variants={reveal} {...props}>
      {children}
    </motion.div>
  );
};
