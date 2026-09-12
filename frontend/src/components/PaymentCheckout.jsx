import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import GlassButton from './GlassButton.jsx';
import { api } from '../lib/api.js';
import { EASE } from '../lib/motion.js';

// Secure payment handoff modal. Opens only after CAPITA returns ALLOW/execute.
// The server RE-VALIDATES on checkout and again on confirm — this component
// never asserts "it was allowed"; it just submits the same document and the
// backend decides. Mock gateway: no real money moves.
export default function PaymentCheckout({ doc, onClose }) {
  const [phase, setPhase] = useState('loading'); // loading | checkout | processing | done | blocked | error
  const [checkout, setCheckout] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.paymentCheckout({
          type: doc.type,
          text: doc.text,
          filename: doc.filename,
          ...(doc.requestedAmount != null ? { requestedAmount: doc.requestedAmount } : {}),
          confirmed: !!doc.confirmed,
        });
        setCheckout(res.checkout);
        setPhase('checkout');
      } catch (e) {
        // 403 → CAPITA did not authorize (should not happen if button gating is correct)
        setError(e.message);
        setPhase('blocked');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pay() {
    setPhase('processing');
    try {
      const res = await api.paymentConfirm({
        checkoutId: checkout.checkoutId,
        confirmed: true,
        simulate: 'success',
      });
      setResult(res);
      setPhase('done');
    } catch (e) {
      setError(e.message);
      setPhase('error');
    }
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4">
      {/* backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="glass glass-edge relative w-full max-w-md rounded-3xl p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LockIcon />
            <span className="font-display text-lg font-semibold text-white">Secure checkout</span>
          </div>
          <button onClick={onClose} className="text-white/40 transition-colors hover:text-white">✕</button>
        </div>

        <div className="mb-4 rounded-xl border border-signal-execute/25 bg-signal-execute/[0.06] px-3 py-2 text-[12px] text-signal-execute">
          Authorized by CAPITA · the gateway only receives a validated action
        </div>

        <AnimatePresence mode="wait">
          {phase === 'loading' && (
            <motion.div key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid h-40 place-items-center text-white/50">
              Validating with CAPITA…
            </motion.div>
          )}

          {phase === 'blocked' && (
            <motion.div key="b" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid h-40 place-items-center text-center text-signal-refuse">
              <div>Payment refused — CAPITA did not authorize this action.<div className="mt-2 text-xs text-white/40">{error}</div></div>
            </motion.div>
          )}

          {phase === 'checkout' && checkout && (
            <motion.div key="c" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Row label="Merchant" value={checkout.merchant} />
              <Row label="Invoice ID" value={checkout.invoiceId} mono />
              <Row label="Amount" value={`₹${Number(checkout.amount).toLocaleString('en-IN')}`} strong />
              <Row label="Checkout ID" value={checkout.checkoutId.slice(0, 8) + '…'} mono small />

              <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm text-white/70">
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-accent" />
                I confirm this payment of ₹{Number(checkout.amount).toLocaleString('en-IN')} to {checkout.merchant}.
              </label>

              <GlassButton onClick={pay} variant="primary" className="mt-5 w-full" disabled={!confirmed}>
                {confirmed ? `Pay ₹${Number(checkout.amount).toLocaleString('en-IN')}` : 'Confirm to enable payment'}
              </GlassButton>
              <p className="mt-2 text-center text-[10px] text-white/35">Mock gateway — no real money moves.</p>
            </motion.div>
          )}

          {phase === 'processing' && (
            <motion.div key="p" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid h-40 place-items-center text-white/60">
              <div className="flex items-center gap-2"><span className="h-2 w-2 animate-pulseglow rounded-full bg-accent" /> Processing payment…</div>
            </motion.div>
          )}

          {phase === 'done' && result && (
            <motion.div key="d" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ ease: EASE, duration: 0.4 }} className="text-center">
              <ResultIcon state={result.state} />
              <div className="mt-3 font-display text-xl font-semibold text-white">
                {result.state === 'SUCCESS' ? 'Payment successful' : result.state === 'FAILED' ? 'Payment failed' : 'Payment cancelled'}
              </div>
              {result.receipt ? (
                <div className="mt-4 space-y-2 text-left">
                  <Row label="Transaction ID" value={result.receipt.txnId} mono />
                  <Row label="Amount" value={`₹${Number(result.receipt.amount).toLocaleString('en-IN')}`} strong />
                  <Row label="Merchant" value={result.receipt.merchant} />
                  <Row label="Provider ref" value={result.receipt.providerRef} mono small />
                  <Row label="Gateway" value={result.receipt.gateway} small />
                  <Row label="Audit HMAC" value={result.receipt.auditHash} mono small />
                </div>
              ) : (
                <p className="mt-3 text-sm text-white/55">{result.message}</p>
              )}
              <GlassButton onClick={onClose} variant="ghost" className="mt-5 w-full">Done</GlassButton>
            </motion.div>
          )}

          {phase === 'error' && (
            <motion.div key="e" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid h-40 place-items-center text-center text-signal-refuse">
              <div>{error}<GlassButton onClick={onClose} variant="ghost" className="mt-4">Close</GlassButton></div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function Row({ label, value, mono, strong, small }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/6 py-2 last:border-0">
      <span className="text-[11px] uppercase tracking-[0.14em] text-white/40">{label}</span>
      <span className={`text-right ${mono ? 'font-mono' : ''} ${strong ? 'text-base font-semibold text-white' : small ? 'text-[11px] text-white/60' : 'text-sm text-white/80'}`}>
        {value}
      </span>
    </div>
  );
}

function ResultIcon({ state }) {
  const map = {
    SUCCESS: { c: 'border-signal-execute/40 bg-signal-execute/10 text-signal-execute', i: '✓' },
    FAILED: { c: 'border-signal-refuse/40 bg-signal-refuse/10 text-signal-refuse', i: '✕' },
    CANCELLED: { c: 'border-signal-escalate/40 bg-signal-escalate/10 text-signal-escalate', i: '⊘' },
  }[state] || { c: 'border-white/20 text-white/60', i: '·' };
  return <div className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl border text-2xl ${map.c}`}>{map.i}</div>;
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="text-signal-execute">
      <rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
