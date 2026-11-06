/**
 * Kiki, the TapNodd mascot: a dachshund with a pink bow.
 * Poses follow the expression sheet:
 *  - happy   — the default; welcome screens, onboarding and freebies
 *  - sleepy  — empty states, loading and "nothing here yet"
 *  - zoomies — success, rewards and celebrations
 *  - face    — front face, for the splash and avatars
 * Animation (tail wag, blinks, breathing, speed lines) lives in globals.css
 * under the .kiki classes and is disabled by prefers-reduced-motion.
 */
const C = {
  coat: "#9B5A2B",
  coatFar: "#84491F",
  ear: "#73411A",
  muzzle: "#EBC69B",
  bow: "#FF8FC4",
  bowDark: "#F272AE",
  collar: "#FFC84A",
  tag: "#F2A91F",
  ink: "#20283D",
};

function Bow({ x, y, s = 1, r = 0 }: { x: number; y: number; s?: number; r?: number }) {
  return (
    <g className="n-bow" transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <ellipse cx={-13} cy={0} rx={12} ry={8} fill={C.bow} transform="rotate(-18 -13 0)" />
      <ellipse cx={13} cy={0} rx={12} ry={8} fill={C.bow} transform="rotate(18 13 0)" />
      <circle r={5.5} fill={C.bowDark} />
    </g>
  );
}

export type KikiPose = "happy" | "sleepy" | "zoomies" | "face";

export default function Kiki({ pose = "happy", width = 170, className, style }: { pose?: KikiPose; width?: number; className?: string; style?: React.CSSProperties }) {
  const label = { happy: "Kiki the dachshund, standing and smiling", sleepy: "Kiki the dachshund, asleep", zoomies: "Kiki the dachshund, running at full speed", face: "Kiki the dachshund, smiling" }[pose];
  const box = { happy: "0 0 230 140", sleepy: "0 0 230 125", zoomies: "0 0 245 125", face: "0 0 160 165" }[pose];

  return (
    <svg viewBox={box} width={width} role="img" aria-label={label} className={`kiki kiki-${pose}${className ? ` ${className}` : ""}`} style={style}>
      {pose === "happy" && (
        <g>
          <ellipse cx={112} cy={130} rx={76} ry={7} fill={C.ink} opacity={0.07} />
          <g className="n-all">
            <path className="n-tail" d="M44 72 C 28 66 22 52 32 42" stroke={C.coat} strokeWidth={9} strokeLinecap="round" fill="none" />
            <rect x={52} y={92} width={13} height={32} rx={6} fill={C.coatFar} />
            <rect x={144} y={92} width={13} height={32} rx={6} fill={C.coatFar} />
            <rect x={36} y={58} width={140} height={48} rx={24} fill={C.coat} />
            <rect x={66} y={96} width={13} height={32} rx={6} fill={C.coat} />
            <rect x={158} y={96} width={13} height={32} rx={6} fill={C.coat} />
            <rect x={158} y={58} width={11} height={46} rx={5} fill={C.collar} />
            <circle cx={164} cy={106} r={6} fill={C.tag} />
            <circle cx={188} cy={48} r={30} fill={C.coat} />
            <ellipse cx={208} cy={58} rx={18} ry={13} fill={C.muzzle} />
            <circle cx={218} cy={51} r={6} fill={C.ink} />
            <path d="M202 64 q 6 6 14 2" stroke={C.ink} strokeWidth={2.5} strokeLinecap="round" fill="none" />
            <circle className="n-eye" cx={190} cy={41} r={3.5} fill={C.ink} />
            <circle cx={180} cy={58} r={5} fill={C.bow} opacity={0.35} />
            <ellipse className="n-ear" cx={174} cy={54} rx={10} ry={23} fill={C.ear} transform="rotate(8 174 54)" />
            <Bow x={188} y={17} />
          </g>
        </g>
      )}

      {pose === "sleepy" && (
        <g>
          <ellipse cx={112} cy={110} rx={84} ry={7} fill={C.ink} opacity={0.07} />
          <g className="n-breathe">
            <path d="M36 84 C 22 84 20 70 32 68" stroke={C.coat} strokeWidth={8} strokeLinecap="round" fill="none" />
            <rect x={30} y={66} width={150} height={40} rx={20} fill={C.coat} />
            <rect x={148} y={96} width={36} height={11} rx={5.5} fill={C.coatFar} />
            <circle cx={176} cy={70} r={26} fill={C.coat} />
            <ellipse cx={192} cy={78} rx={15} ry={11} fill={C.muzzle} />
            <circle cx={201} cy={73} r={5} fill={C.ink} />
            <path d="M172 66 q 5 4.5 10 0" stroke={C.ink} strokeWidth={2.5} strokeLinecap="round" fill="none" />
            <ellipse cx={162} cy={74} rx={9} ry={20} fill={C.ear} transform="rotate(18 162 74)" />
            <Bow x={172} y={46} s={0.9} r={-10} />
          </g>
          <text className="n-zz n-zz1" x={204} y={46} fontSize={13} fontWeight={700} fill={C.ink}>z</text>
          <text className="n-zz n-zz2" x={212} y={34} fontSize={17} fontWeight={700} fill={C.ink}>z</text>
          <text className="n-zz n-zz3" x={221} y={20} fontSize={21} fontWeight={700} fill={C.ink}>z</text>
        </g>
      )}

      {pose === "zoomies" && (
        <g>
          <ellipse cx={135} cy={114} rx={68} ry={6} fill={C.ink} opacity={0.06} />
          <g className="n-lines" stroke={C.ink} strokeWidth={4} strokeLinecap="round" opacity={0.22}>
            <path d="M12 48 h 34" /><path d="M6 63 h 28" /><path d="M14 78 h 34" />
          </g>
          <g className="n-all">
            <path className="n-tail" d="M62 54 C 50 44 48 34 56 28" stroke={C.coat} strokeWidth={8} strokeLinecap="round" fill="none" />
            <g stroke={C.coat} strokeWidth={11} strokeLinecap="round">
              <path d="M66 78 L 44 94" /><path d="M76 82 L 58 102" />
              <path d="M178 78 L 202 94" /><path d="M186 82 L 210 100" />
            </g>
            <rect x={58} y={48} width={132} height={36} rx={18} fill={C.coat} />
            <circle cx={200} cy={44} r={27} fill={C.coat} />
            <ellipse className="n-ear" cx={180} cy={30} rx={20} ry={8} fill={C.ear} transform="rotate(-22 180 30)" />
            <ellipse cx={218} cy={52} rx={16} ry={12} fill={C.muzzle} />
            <circle cx={228} cy={45} r={5.5} fill={C.ink} />
            <path d="M212 58 q 6 6 12 1" stroke={C.ink} strokeWidth={2.5} strokeLinecap="round" fill="none" />
            <ellipse className="n-tongue" cx={219} cy={66} rx={5} ry={7.5} fill={C.bowDark} transform="rotate(14 219 66)" />
            <circle className="n-eye" cx={200} cy={37} r={3.5} fill={C.ink} />
            <Bow x={198} y={14} s={0.95} r={6} />
          </g>
        </g>
      )}

      {pose === "face" && (
        <g className="n-all">
          <ellipse className="n-ear n-ear-l" cx={34} cy={84} rx={17} ry={42} fill={C.ear} />
          <ellipse className="n-ear n-ear-r" cx={126} cy={84} rx={17} ry={42} fill={C.ear} />
          <circle cx={80} cy={78} r={52} fill={C.coat} />
          <ellipse cx={80} cy={102} rx={30} ry={22} fill={C.muzzle} />
          <ellipse cx={80} cy={91} rx={9} ry={7} fill={C.ink} />
          <path d="M80 98 v 6" stroke={C.ink} strokeWidth={2.5} strokeLinecap="round" />
          <path d="M80 104 q -8 9 -16 2 M80 104 q 8 9 16 2" stroke={C.ink} strokeWidth={2.5} strokeLinecap="round" fill="none" />
          <ellipse className="n-tongue" cx={80} cy={113} rx={6.5} ry={8} fill={C.bowDark} />
          <g className="n-eye">
            <circle cx={58} cy={70} r={6} fill={C.ink} />
            <circle cx={60} cy={68} r={2} fill="#fff" />
          </g>
          <g className="n-eye">
            <circle cx={102} cy={70} r={6} fill={C.ink} />
            <circle cx={104} cy={68} r={2} fill="#fff" />
          </g>
          <circle cx={44} cy={92} r={7} fill={C.bow} opacity={0.35} />
          <circle cx={116} cy={92} r={7} fill={C.bow} opacity={0.35} />
          <Bow x={80} y={22} s={1.2} />
          <rect x={48} y={128} width={64} height={13} rx={6.5} fill={C.collar} />
          <circle cx={80} cy={147} r={9} fill={C.tag} />
          <circle cx={80} cy={147} r={4} fill="none" stroke="#fff" strokeWidth={2} opacity={0.7} />
        </g>
      )}
    </svg>
  );
}
