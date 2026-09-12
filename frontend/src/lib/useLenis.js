import { useEffect } from 'react';
import Lenis from 'lenis';

// ---------------------------------------------------------------------------
// Buttery smooth scrolling via Lenis (the industry-standard smooth-scroll lib).
//
// Lenis drives scroll from a single requestAnimationFrame loop with a tuned
// easing curve, so it feels fluid and renders at the display's native refresh
// rate (60 / 120 / 144 Hz). It also cooperates with anchor links and doesn't
// fight the browser the way a hand-rolled wheel hijack does.
//
// Disabled under prefers-reduced-motion (those users get plain native scroll).
// ---------------------------------------------------------------------------
export function useLenis() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const lenis = new Lenis({
      duration: 1.1, // higher = more glide
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // expo-out
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
      lerp: 0.1,
    });

    // Expose so parallax/3D can read a smoothed scroll if desired.
    window.__lenis = lenis;

    let rafId;
    function raf(time) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    // Smoothly handle in-page anchor links (navbar / footer).
    const onClick = (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el, { offset: -80, duration: 1.2 });
    };
    document.addEventListener('click', onClick);

    return () => {
      document.removeEventListener('click', onClick);
      cancelAnimationFrame(rafId);
      lenis.destroy();
      delete window.__lenis;
    };
  }, []);
}
