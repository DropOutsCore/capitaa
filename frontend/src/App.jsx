import { lazy, Suspense } from 'react';
import Navbar from './components/Navbar.jsx';
import ParallaxBackground from './components/ParallaxBackground.jsx';
import Hero from './sections/Hero.jsx';
import Problem from './sections/Problem.jsx';
import HowItWorks from './sections/HowItWorks.jsx';
import LiveDemo from './sections/LiveDemo.jsx';
import AttackLab from './sections/AttackLab.jsx';
import ProofDemo from './sections/ProofDemo.jsx';
import AuditLog from './sections/AuditLog.jsx';
import Security from './sections/Security.jsx';
import Footer from './sections/Footer.jsx';

// The WebGL depth field is code-split so it never blocks first paint.
const ParallaxField3D = lazy(() => import('./components/ParallaxField3D.jsx'));

export default function App() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <ParallaxBackground />
      <Suspense fallback={null}>
        <ParallaxField3D />
      </Suspense>
      <Navbar />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        {/* Centerpiece: the live Trust Console + the Attack Lab */}
        <LiveDemo />
        <AttackLab />
        <ProofDemo />
        <AuditLog />
        <Security />
      </main>
      <Footer />
    </div>
  );
}
