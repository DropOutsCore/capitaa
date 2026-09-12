import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../lib/api.js';
import { EASE } from '../lib/motion.js';

// Public, standalone proof-verification page reached via a shared link
// (/verify?id=...). It independently asks the backend to re-verify the proof
// and shows Valid / Invalid / Expired. The private balance is never available
// here — the page can only ever display "Hidden".
export default function VerifyProof() {
  const [state, setState] = useState('LOADING'); // LOADING | VALID | INVALID | EXPIRED | NOT_FOUND | ERROR
  const [data, setData] = useState(null);
  const id = new URLSearchParams(window.location.search).get('id');

  useEffect(() => {
    if (!id) {
      setState('NOT_FOUND');
      return;
    }
    (async () => {
      try {
        const res = await api.verifySharedProof(id);
        setData(res);
        setState(res.state || 'ERROR');
      } catch (e) {
        setState(e.message && e.message.includes('404') ? 'NOT_FOUND' : 'ERROR');
      }
    })();
  }, [id]);

  const tone = {
    VALID: { ring: 'border-signal-execute/40 bg-signal-execute/10 text-signal-execute', icon: '✓', title: 'Proof Valid' },
    INVALID: { ring: 'border-signal-refuse/40 bg-signal-refuse/10 text-signal-refuse', icon: '✕', title: 'Proof Invalid' },
    EXPIRED: { ring: 'border-signal-escalate/40 bg-signal-escalate/10 text-signal-escalate', icon: '⌛', title: 'Proof Expired' },
    NOT_FOUND: { ring: 'border-white/20 bg-white/5 text-white/60', icon: '?', title: 'Proof Not Found' },
    ERROR: { ring: 'border-signal-refuse/40 bg-signal-refuse/10 text-signal-refuse', icon: '!', title: 'Verification Error' },
    LOADING: { ring: 'border-accent/30 bg-accent/10 text-accent', icon: '…', title: 'Verifying…' },
  }[state];

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-6 py-16">
      {/* ambient background consistent with the app */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          backgroundImage:
            'radial-gradient(60rem 60rem at 80% -10%, rgba(63,111,224,0.12), transparent 60%), radial-gradient(50rem 50rem at 0% 20%, rgba(110,168,255,0.08), transparent 55%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE }}
        className="glass glass-edge w-full max-w-md rounded-3xl p-8 text-center"
      >
        <div className="mb-6 flex items-center justify-center gap-2">
          <ShieldMark />
          <span className="font-display text-lg font-semibold tracking-tight text-white">CAPITA</span>
          <span className="text-white/30">· proof verification</span>
        </div>

        <div className={`mx-auto grid h-20 w-20 place-items-center rounded-2xl border text-3xl ${tone.ring}`}>
          {tone.icon}
        </div>
        <h1 className="mt-5 font-display text-2xl font-semibold text-gradient">{tone.title}</h1>

        {state === 'LOADING' && (
          <p className="mt-2 text-sm text-white/50">Independently re-checking the proof…</p>
        )}

        {(state === 'VALID' || state === 'INVALID' || state === 'EXPIRED') && data && (
          <div className="mt-6 space-y-2 text-left">
            <Row label="Claim" value={data.claim} />
            <Row label="Actual balance" value="Hidden" mono />
            <Row label="Verification status" value={state} />
            <Row label="Proof ID" value={data.proofId} mono small />
            <Row label="Expiry" value={new Date(data.expiresAt).toLocaleString()} />
            {state === 'VALID' && data.verificationMs != null && (
              <Row label="Verified in" value={`${data.verificationMs} ms`} />
            )}
          </div>
        )}

        {state === 'NOT_FOUND' && (
          <p className="mt-3 text-sm text-white/50">
            This proof link is invalid or was never published.
          </p>
        )}
        {state === 'ERROR' && (
          <p className="mt-3 text-sm text-white/50">Could not reach the verifier. Please try again.</p>
        )}

        <div className="mt-7 border-t border-white/10 pt-4 text-[11px] leading-relaxed text-white/40">
          The verifier re-computes the zero-knowledge range proof from the public commitment. It learns only
          whether the predicate holds — never the balance, its range, or timing.
        </div>

        <a
          href="/"
          className="mt-5 inline-block text-xs text-accent/80 transition-colors hover:text-accent"
        >
          ← Back to CAPITA
        </a>
      </motion.div>
    </div>
  );
}

function Row({ label, value, mono, small }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
      <span className="text-[11px] uppercase tracking-[0.14em] text-white/40">{label}</span>
      <span className={`text-right text-white/80 ${mono ? 'font-mono' : ''} ${small ? 'text-[11px]' : 'text-sm'} ${small ? 'truncate max-w-[60%]' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function ShieldMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden>
      <defs>
        <linearGradient id="vpg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8fbaff" />
          <stop offset="1" stopColor="#3f6fe0" />
        </linearGradient>
      </defs>
      <path d="M16 4l9 3.5v6.2c0 5.6-3.8 10.4-9 12.3-5.2-1.9-9-6.7-9-12.3V7.5L16 4z" stroke="url(#vpg)" strokeWidth="2" strokeLinejoin="round" />
      <path d="M11.5 16.2l3.2 3.2 6-6.6" stroke="url(#vpg)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
