/** The TapNodd mark from the design: two signal arcs over a person, the moment of a tap. */
export default function Logo({ size = 72, className, style }: { size?: number; className?: string; style?: React.CSSProperties }) {
  const ink = { fill: "var(--logo-ink, #3B0F8C)" };
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} role="img" aria-label="TapNodd" className={className} style={style}>
      <path d="M13.8 19.5A21 21 0 0 1 50.2 19.5" fill="none" stroke="#A78BFA" strokeWidth="4.6" strokeLinecap="round" />
      <path d="M21.6 24A12 12 0 0 1 42.4 24" fill="none" stroke="#7C3AED" strokeWidth="4.6" strokeLinecap="round" />
      <circle cx="32" cy="30.5" r="5.6" style={ink} />
      <rect x="28" y="39.5" width="8" height="17" rx="4" style={ink} />
    </svg>
  );
}
