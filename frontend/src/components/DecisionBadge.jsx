// Small pill that renders the three explicit security outcomes with a
// consistent color language used across the whole product.
const MAP = {
  execute: { label: 'EXECUTE', color: 'text-signal-execute', ring: 'border-signal-execute/40', bg: 'bg-signal-execute/10', dot: 'bg-signal-execute' },
  refuse: { label: 'REFUSE', color: 'text-signal-refuse', ring: 'border-signal-refuse/40', bg: 'bg-signal-refuse/10', dot: 'bg-signal-refuse' },
  escalate: { label: 'ESCALATE', color: 'text-signal-escalate', ring: 'border-signal-escalate/40', bg: 'bg-signal-escalate/10', dot: 'bg-signal-escalate' },
};

export default function DecisionBadge({ decision, size = 'md' }) {
  const m = MAP[decision] || MAP.escalate;
  const pad = size === 'lg' ? 'px-4 py-2 text-sm' : 'px-3 py-1 text-xs';
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border ${m.ring} ${m.bg} ${m.color} ${pad} font-semibold tracking-[0.14em]`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot} animate-pulseglow`} />
      {m.label}
    </span>
  );
}
