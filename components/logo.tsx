/** The TapNodd logo mark: two business cards meeting at the exchange moment, on the brand gradient. */
export default function Logo({ size = 72, className, style }: { size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} role="img" aria-label="TapNodd" className={className} style={style}>
      <defs>
        <linearGradient id="tn-lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b5bdb" />
          <stop offset="1" stopColor="#7048e8" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="17" fill="url(#tn-lg)" />
      <rect x="12" y="19" width="27" height="18" rx="5" fill="#fff" opacity="0.45" transform="rotate(-9 25.5 28)" />
      <rect x="25" y="27" width="27" height="18" rx="5" fill="#fff" transform="rotate(7 38.5 36)" />
      <path d="M22 14 l2.4 4.6 M30 11.5 l.6 5.1 M15 20 l4.4 2.6" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}
