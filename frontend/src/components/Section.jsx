import Reveal from './Reveal.jsx';

// A consistently-spaced section shell with an optional eyebrow + heading block.
export default function Section({ id, eyebrow, title, intro, children, className = '' }) {
  return (
    <section id={id} className={`relative mx-auto w-full max-w-7xl px-6 py-24 md:py-32 ${className}`}>
      {(eyebrow || title || intro) && (
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          {eyebrow && <span className="eyebrow mb-5">{eyebrow}</span>}
          {title && (
            <h2 className="mt-5 font-display text-4xl font-semibold tracking-tightest text-gradient md:text-5xl">
              {title}
            </h2>
          )}
          {intro && <p className="mt-5 text-base leading-relaxed text-white/70 md:text-lg">{intro}</p>}
        </Reveal>
      )}
      {children}
    </section>
  );
}
