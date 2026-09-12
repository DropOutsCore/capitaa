import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Section from '../components/Section.jsx';
import Reveal from '../components/Reveal.jsx';
import GlassButton from '../components/GlassButton.jsx';
import { api } from '../lib/api.js';
import { EASE } from '../lib/motion.js';
import { qrSvg } from '../lib/qr.js';

// Demonstrates proving "balance >= threshold" without revealing the balance,
// using the real Pedersen + range-proof backend. The private value never
// leaves the prover; the verifier only ever sees the commitment + proof.
export default function ProofDemo() {
  const [balance, setBalance] = useState(147283);
  const [threshold, setThreshold] = useState(100000);
  const [proof, setProof] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);
  const [busy, setBusy] = useState(null); // 'gen' | 'verify' | 'share'
  const [error, setError] = useState(null);
  const [share, setShare] = useState(null); // { proofId, url, qr, expiresAt }
  const [copied, setCopied] = useState(false);

  // Publish ONLY the public artifact (claim + commitment + proof). The private
  // balance is never part of `proof`, so it cannot leak into the link or QR.
  async function shareProof() {
    if (!proof || !verifyResult?.valid) return;
    setBusy('share');
    setError(null);
    try {
      const res = await api.shareProof({
        claim: `Balance ≥ ₹${Number(threshold).toLocaleString('en-IN')}`,
        commitment: proof.commitment,
        threshold: proof.threshold,
        nBits: proof.nBits,
        proof: proof.proof,
      });
      const url = `${window.location.origin}${res.verifyPath}`;
      const qr = await qrSvg(url, { size: 168 });
      setShare({ proofId: res.proofId, url, qr, expiresAt: res.expiresAt });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function copyLink() {
    if (!share) return;
    try {
      await navigator.clipboard.writeText(share.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  }

  async function generate() {
    setBusy('gen');
    setError(null);
    setVerifyResult(null);
    setProof(null);
    setShare(null);
    try {
      const p = await api.generateProof(Number(balance), Number(threshold));
      setProof(p);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function verify() {
    if (!proof) return;
    setBusy('verify');
    setError(null);
    try {
      const v = await api.verifyProof({
        commitment: proof.commitment,
        threshold: proof.threshold,
        nBits: proof.nBits,
        proof: proof.proof,
      });
      setVerifyResult(v);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Section
      id="proof"
      eyebrow="Verifiable privacy"
      title="Prove it. Don't reveal it."
      intro="A zero-knowledge predicate proof: convince a verifier that your balance clears a threshold without disclosing the balance, its range, or timing. This runs on real Pedersen commitments and a bit-decomposition range proof — latency is measured, not mocked."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Prover */}
        <Reveal>
          <div className="glass glass-edge h-full rounded-3xl p-6">
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-white/40">
              <LockIcon /> Prover (private)
            </div>

            <label className="mb-1.5 block text-xs text-white/50">Private balance (₹)</label>
            <input
              type="number"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className="mb-4 w-full rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2 text-sm outline-none focus:border-accent/50"
            />
            <label className="mb-1.5 block text-xs text-white/50">Public threshold (₹)</label>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="mb-4 w-full rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2 text-sm outline-none focus:border-accent/50"
            />

            <GlassButton onClick={generate} variant="primary" className="w-full" disabled={busy === 'gen'}>
              {busy === 'gen' ? 'Generating proof…' : 'Generate proof'}
            </GlassButton>

            <p className="mt-3 text-[11px] leading-relaxed text-white/40">
              The balance is used locally to build the proof. It is never included in the response sent to the verifier.
            </p>
          </div>
        </Reveal>

        {/* Transit / commitment */}
        <Reveal>
          <div className="glass h-full rounded-3xl p-6">
            <div className="mb-4 text-xs uppercase tracking-[0.16em] text-white/40">On the wire</div>
            <AnimatePresence mode="wait">
              {proof ? (
                <motion.div key="p" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: EASE, duration: 0.4 }}>
                  <Field label="Predicate">{proof.predicate}</Field>
                  <Field label="Commitment">
                    <span className="font-mono text-[11px] text-accent/80 break-all">{proof.commitment.slice(0, 48)}…</span>
                  </Field>
                  <Field label="Proof size">{proof.proof ? `${proof.proof.Cs.length} bit-commitments` : 'no proof (unsatisfiable)'}</Field>
                  <Field label="Generation">{proof.generationMs} ms</Field>
                  <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.03] p-3 text-[11px] leading-relaxed text-white/50">
                    Verifier receives: commitment, threshold, proof.
                    <br />
                    Verifier never receives: the balance, its range, or timing.
                  </div>
                </motion.div>
              ) : (
                <motion.div key="e" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid h-40 place-items-center text-center text-sm text-white/40">
                  Generate a proof to see what crosses the wire.
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Reveal>

        {/* Verifier */}
        <Reveal>
          <div className="glass glass-edge h-full rounded-3xl p-6">
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-white/40">
              <CheckShieldIcon /> Verifier
            </div>

            <GlassButton onClick={verify} variant="ghost" className="w-full" disabled={!proof || busy === 'verify'}>
              {busy === 'verify' ? 'Verifying…' : 'Verify proof'}
            </GlassButton>

            <div className="mt-4 min-h-[9rem]">
              <AnimatePresence mode="wait">
                {error ? (
                  <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-signal-refuse">
                    {error}
                  </motion.div>
                ) : verifyResult ? (
                  <motion.div
                    key="v"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ ease: EASE, duration: 0.4 }}
                    className="text-center"
                  >
                    <div
                      className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl border text-2xl ${
                        verifyResult.valid
                          ? 'border-signal-execute/40 bg-signal-execute/10 text-signal-execute'
                          : 'border-signal-refuse/40 bg-signal-refuse/10 text-signal-refuse'
                      }`}
                    >
                      {verifyResult.valid ? '✓' : '✕'}
                    </div>
                    <div className="mt-3 font-display text-lg font-semibold text-white">
                      {verifyResult.valid ? 'Predicate verified' : 'Verification failed'}
                    </div>
                    <div className="mt-1 text-sm text-white/50">
                      {verifyResult.valid
                        ? `Balance clears ₹${Number(threshold).toLocaleString('en-IN')} — value stays hidden.`
                        : 'Proof did not check out.'}
                    </div>
                    <div className="mt-2 text-[11px] text-white/40">verified in {verifyResult.verificationMs} ms</div>

                    {verifyResult.valid && (
                      <div className="mt-4">
                        {!share ? (
                          <GlassButton onClick={shareProof} variant="ghost" className="w-full text-[13px]" disabled={busy === 'share'}>
                            {busy === 'share' ? 'Creating link…' : 'Share proof'}
                          </GlassButton>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, ease: EASE }}
                            className="rounded-xl border border-white/10 bg-ink-950/50 p-3 text-left"
                          >
                            <div className="mb-2 text-[11px] uppercase tracking-[0.14em] text-white/40">
                              Shareable verification
                            </div>
                            <div
                              className="mx-auto mb-3 w-fit overflow-hidden rounded-lg bg-white p-1.5"
                              dangerouslySetInnerHTML={{ __html: share.qr }}
                            />
                            <div className="flex items-center gap-2">
                              <input
                                readOnly
                                value={share.url}
                                onFocus={(e) => e.target.select()}
                                className="min-w-0 flex-1 truncate rounded-lg border border-white/10 bg-ink-950/60 px-2.5 py-1.5 font-mono text-[11px] text-white/70 outline-none"
                              />
                              <button
                                onClick={copyLink}
                                className="flex-none rounded-lg border border-white/12 bg-white/[0.04] px-3 py-1.5 text-xs text-white/70 transition-colors hover:text-white"
                              >
                                {copied ? 'Copied' : 'Copy'}
                              </button>
                            </div>
                            <div className="mt-2 text-[10px] text-white/35">
                              Scan or open the link — the verifier re-checks the proof and never sees the balance. Expires{' '}
                              {new Date(share.expiresAt).toLocaleString()}.
                            </div>
                            {/localhost|127\.0\.0\.1/.test(share.url) && (
                              <div className="mt-2 rounded-lg border border-signal-escalate/30 bg-signal-escalate/[0.08] px-2.5 py-1.5 text-[10px] text-signal-escalate">
                                This link points to localhost, so a phone on another network can't open it. Open it in a new
                                browser tab here, or deploy the app to get a publicly scannable link.
                              </div>
                            )}
                          </motion.div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid h-36 place-items-center text-center text-sm text-white/40">
                    The verifier learns only whether the predicate holds.
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </Reveal>
      </div>

      <Reveal className="mt-6">
        <p className="text-center text-xs text-white/40">
          Honest scope: a demonstration of a real ZK range proof over 1024-bit MODP parameters, chosen for interactive latency — not a production parameter set.
        </p>
      </Reveal>
    </Section>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-2.5">
      <div className="text-[11px] uppercase tracking-[0.14em] text-white/35">{label}</div>
      <div className="mt-0.5 text-sm text-white/75">{children}</div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function CheckShieldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 2.5v5c0 4.5-3 8.4-7 9.5-4-1.1-7-5-7-9.5v-5L12 3z" />
      <path d="M9 12l2 2 4-4.5" />
    </svg>
  );
}
