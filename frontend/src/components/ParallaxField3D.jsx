import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { usePrefersReducedMotion } from '../lib/useReducedMotion.js';

// ---------------------------------------------------------------------------
// SCROLL-MORPHING PARTICLE FIELD
// A single cloud of particles that flows between meaningful formations as you
// scroll: shield → ₹ → $ → padlock. Each shape's target positions are sampled
// from an offscreen canvas, and the particles ease toward the blended target
// every frame, so scrolling "morphs" the cloud. The camera parallaxes toward
// the pointer and the cloud drifts on its own. Decorative, pointer-events off,
// theme-aware, and disabled under prefers-reduced-motion.
// ---------------------------------------------------------------------------

function scrollProgress() {
  const doc = document.documentElement;
  const max = doc.scrollHeight - doc.clientHeight;
  return max > 0 ? Math.min(1, Math.max(0, doc.scrollTop / max)) : 0;
}

// Draw helpers whose alpha channel defines where particles should sit.
function glyph(ch) {
  return (ctx, s) => {
    ctx.fillStyle = '#fff';
    ctx.font = `900 ${s * 0.74}px "Sora", "Inter", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ch, s / 2, s / 2 + s * 0.02);
  };
}

function drawShield(ctx, s) {
  const cx = s / 2;
  const w = s * 0.32;
  const top = s * 0.16;
  const mid = s * 0.52;
  const bottom = s * 0.9;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(cx - w, top);
  ctx.lineTo(cx + w, top);
  ctx.lineTo(cx + w, mid);
  ctx.quadraticCurveTo(cx + w, bottom, cx, bottom);
  ctx.quadraticCurveTo(cx - w, bottom, cx - w, mid);
  ctx.closePath();
  ctx.fill();
}

function drawLock(ctx, s) {
  const cx = s / 2;
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';
  // shackle
  ctx.lineWidth = s * 0.07;
  ctx.beginPath();
  ctx.arc(cx, s * 0.42, s * 0.16, Math.PI, 0);
  ctx.stroke();
  // body
  const bw = s * 0.44;
  const bh = s * 0.34;
  const r = s * 0.05;
  const x = cx - bw / 2;
  const y = s * 0.44;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + bw, y, x + bw, y + bh, r);
  ctx.arcTo(x + bw, y + bh, x, y + bh, r);
  ctx.arcTo(x, y + bh, x, y, r);
  ctx.arcTo(x, y, x + bw, y, r);
  ctx.closePath();
  ctx.fill();
}

const FORMATION_DRAWERS = [drawShield, glyph('₹'), glyph('$'), drawLock];

// Sample `count` target points (Float32Array xyz) from a draw function.
function sampleFormation(drawFn, count, size = 224, spread = 7) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.clearRect(0, 0, size, size);
  drawFn(ctx, size);

  const data = ctx.getImageData(0, 0, size, size).data;
  const candidates = [];
  for (let y = 0; y < size; y += 2) {
    for (let x = 0; x < size; x += 2) {
      if (data[(y * size + x) * 4 + 3] > 128) candidates.push(x, y);
    }
  }

  const out = new Float32Array(count * 3);
  const n = candidates.length / 2;
  for (let i = 0; i < count; i++) {
    let px = size / 2;
    let py = size / 2;
    if (n > 0) {
      const c = (Math.random() * n) | 0;
      px = candidates[c * 2] + (Math.random() - 0.5) * 2;
      py = candidates[c * 2 + 1] + (Math.random() - 0.5) * 2;
    }
    out[i * 3] = (px / size - 0.5) * spread;
    out[i * 3 + 1] = -(py / size - 0.5) * spread;
    out[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
  }
  return out;
}

// A round soft dot texture so particles are circles, not squares.
function makeDotTexture() {
  const s = 64;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.85)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function MorphCloud({ count, isDark }) {
  const pointsRef = useRef();
  const dot = useMemo(makeDotTexture, []);

  // Target formations + starting positions (a loose sphere).
  const formations = useMemo(
    () => FORMATION_DRAWERS.map((fn) => sampleFormation(fn, count)),
    [count]
  );

  const positions = useMemo(() => {
    const a = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 5 + Math.random() * 3;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      a[i * 3] = r * Math.sin(ph) * Math.cos(th);
      a[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      a[i * 3 + 2] = r * Math.cos(ph) - 2;
    }
    return a;
  }, [count]);

  // Per-particle phase for subtle idle shimmer.
  const phases = useMemo(() => {
    const a = new Float32Array(count);
    for (let i = 0; i < count; i++) a[i] = Math.random() * Math.PI * 2;
    return a;
  }, [count]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const p = scrollProgress();
    const F = formations.length;
    let seg = p * (F - 1);
    let i = Math.floor(seg);
    if (i > F - 2) i = F - 2;
    if (i < 0) i = 0;
    const f = seg - i;
    const A = formations[i];
    const B = formations[i + 1];

    const pos = positions;
    const t = state.clock.elapsedTime;
    const damp = 1 - Math.pow(0.001, delta); // frame-rate independent easing

    for (let k = 0; k < count; k++) {
      const ix = k * 3;
      const shimmer = Math.sin(t * 0.8 + phases[k]) * 0.03;
      const tx = A[ix] + (B[ix] - A[ix]) * f;
      const ty = A[ix + 1] + (B[ix + 1] - A[ix + 1]) * f;
      const tz = A[ix + 2] + (B[ix + 2] - A[ix + 2]) * f + shimmer;
      pos[ix] += (tx - pos[ix]) * damp;
      pos[ix + 1] += (ty - pos[ix + 1]) * damp;
      pos[ix + 2] += (tz - pos[ix + 2]) * damp;
    }

    const attr = pointsRef.current.geometry.attributes.position;
    attr.needsUpdate = true;

    // Slow drift + pointer parallax on the camera.
    pointsRef.current.rotation.y += delta * 0.04;
    state.camera.position.x += (state.pointer.x * 1.3 - state.camera.position.x) * 0.04;
    state.camera.position.y += (state.pointer.y * 0.9 - state.camera.position.y) * 0.04;
    state.camera.lookAt(0, 0, 0);
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={dot}
        color={isDark ? '#8fbaff' : '#3f6fe0'}
        size={isDark ? 0.05 : 0.055}
        sizeAttenuation
        transparent
        opacity={isDark ? 0.9 : 0.8}
        alphaTest={0.02}
        depthWrite={false}
        blending={isDark ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </points>
  );
}

function useThemeAttr() {
  const [theme, setTheme] = useState(
    typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') || 'light' : 'light'
  );
  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => setTheme(el.getAttribute('data-theme') || 'light'));
    obs.observe(el, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  return theme;
}

export default function ParallaxField3D() {
  const reduced = usePrefersReducedMotion();
  const theme = useThemeAttr();

  // Under reduced-motion we render nothing — the CSS aurora background remains.
  if (reduced) return null;

  const isDark = theme === 'dark';
  const isSmall = typeof window !== 'undefined' && window.innerWidth < 768;
  const count = isSmall ? 2200 : 5200;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10"
      style={{ opacity: isDark ? 0.95 : 0.75 }}
    >
      <Canvas
        key={isDark ? 'dark' : 'light'}
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 9], fov: 50 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <MorphCloud count={count} isDark={isDark} />
        <fog attach="fog" args={[isDark ? '#07070b' : '#f5f5f7', 12, 26]} />
      </Canvas>
    </div>
  );
}
