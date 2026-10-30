import { AvatarCfg, parseAvatar, shade } from "@/lib/look";

const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };

/**
 * The illustrated 3D-style avatar: shaded skin and hair, glossy eyes, soft lighting. Pure SVG, so it
 * renders on the server and the client. `view` crops to [x, y, size] (used for the editor thumbnails).
 */
export function AvatarArt({ cfg, size, view = [0, 0, 200] }: { cfg: AvatarCfg; size: number; view?: [number, number, number] }) {
  const { bg, skin, face, hair, style, eyes, brows, mouth, glasses, beard, accessory, outfit, shirt } = cfg;
  const id = "av" + hash(JSON.stringify(cfg));
  const u = (n: string) => `url(#${id}${n})`;
  const skinHi = shade(skin, 0.24), skinLo = shade(skin, -0.2), skinDeep = shade(skin, -0.4);
  const mouthInk = "#8a3b32";
  const lensX = [80, 120];

  // Hair shapes. back = behind the head, front = on top of it.
  const hairBack = (
    <>
      {style === 1 && <path d="M46 92 Q38 36 100 30 Q162 36 154 92 L162 176 Q100 190 38 176Z" fill={u("hair")} />}
      {style === 6 && <path d="M138 58 Q184 66 176 124 Q172 158 148 168 Q164 126 134 86Z" fill={u("hair")} />}
      {style === 3 && [[44, 82], [156, 82], [52, 58], [148, 58]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="17" fill={u("hair")} />)}
      {style === 2 && <circle cx="100" cy="26" r="17" fill={u("hair")} />}
    </>
  );
  const hairFront = (
    <>
      {style === 0 && <path d="M49 94 Q42 38 100 33 Q158 38 151 94 Q148 64 128 56 Q100 46 72 56 Q52 64 49 94Z" fill={u("hair")} />}
      {style === 1 && <>
        <path d="M51 90 Q46 40 100 36 Q154 40 149 90 Q142 62 118 58 Q92 72 74 58 Q56 66 51 90Z" fill={u("hair")} />
        <path d="M50 88 Q40 128 50 168 Q64 144 60 96Z" fill={u("hair")} /><path d="M150 88 Q160 128 150 168 Q136 144 140 96Z" fill={u("hair")} />
      </>}
      {style === 2 && <path d="M49 94 Q42 40 100 35 Q158 40 151 94 Q148 64 128 57 Q100 48 72 57 Q52 64 49 94Z" fill={u("hair")} />}
      {style === 3 && [[70, 48], [100, 40], [130, 48], [58, 68], [142, 68], [84, 36], [116, 36]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="19" fill={u("hair")} />)}
      {style === 5 && <path d="M49 94 Q38 34 108 31 Q164 36 151 94 Q150 66 134 56 Q104 76 62 70 Q52 76 49 94Z" fill={u("hair")} />}
      {style === 6 && <path d="M49 94 Q42 38 100 33 Q158 38 151 94 Q148 64 128 56 Q100 46 72 56 Q52 64 49 94Z" fill={u("hair")} />}
      {style === 7 && <path d="M51 92 Q46 46 100 42 Q154 46 149 92 Q146 64 100 58 Q54 64 51 92Z" fill={u("hair")} opacity=".9" />}
      {style !== 4 && <ellipse cx="84" cy="50" rx="22" ry="6.5" fill="#fff" opacity=".2" transform="rotate(-16 84 50)" />}
    </>
  );

  const eye = (cx: number) => (
    <g key={cx}>
      <ellipse cx={cx} cy="97" rx="9.5" ry="8.8" fill="#fbfbfb" />
      <ellipse cx={cx} cy="94" rx="9.5" ry="5" fill="#000" opacity=".08" />
      <circle cx={cx + 0.4} cy="97.6" r="5.8" fill={u("iris")} />
      <circle cx={cx + 0.4} cy="97.6" r="2.7" fill="#0c0c0c" />
      <circle cx={cx - 1.8} cy="95" r="1.9" fill="#fff" /><circle cx={cx + 2.4} cy="99.6" r=".9" fill="#fff" opacity=".8" />
      <path d={`M${cx - 10} 95 Q${cx} ${88} ${cx + 10} 95`} stroke="#2b1d16" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </g>
  );
  const browPath = (side: -1 | 1) => {
    const x = side === -1 ? 80 : 120, d = side;
    const p = [
      `M${x - 12 * d} 83 Q${x} 76 ${x + 11 * d} 82`,
      `M${x - 12 * d} 84 Q${x} 77 ${x + 11 * d} 82`,
      `M${x - 12 * d} 85 Q${x - 2 * d} 72 ${x + 11 * d} 81`,
      `M${x - 12 * d} 80 L${x + 11 * d} 80`,
    ][brows];
    return <path key={side} d={p} stroke={shade(hair, -0.2)} strokeWidth={brows === 1 ? 5 : 3.4} fill="none" strokeLinecap="round" />;
  };

  const mouthEl = [
    <path key="m0" d="M86 125 Q100 138 114 125" stroke={mouthInk} strokeWidth="3" fill="none" strokeLinecap="round" />,
    <g key="m1"><path d="M84 122 Q100 144 116 122 Q100 127 84 122Z" fill="#fff" stroke={mouthInk} strokeWidth="2" strokeLinejoin="round" /></g>,
    <path key="m2" d="M91 128 H109" stroke={mouthInk} strokeWidth="3" fill="none" strokeLinecap="round" />,
    <g key="m3"><path d="M88 122 Q100 148 112 122 Q100 126 88 122Z" fill="#6d2323" /><ellipse cx="100" cy="134" rx="5.5" ry="3.2" fill="#e8707a" /></g>,
    <path key="m4" d="M88 128 Q101 133 114 122" stroke={mouthInk} strokeWidth="3" fill="none" strokeLinecap="round" />,
  ][mouth];

  const frame = "#262a33";
  const glassesEl = glasses === 0 ? null : glasses === 1 ? (
    <g fill="#fff" fillOpacity=".14" stroke={frame} strokeWidth="2.6">
      <circle cx="80" cy="97" r="14" /><circle cx="120" cy="97" r="14" /><path d="M94 96 Q100 92 106 96" fill="none" /><path d="M66 95 L55 92 M134 95 L145 92" fill="none" />
    </g>
  ) : glasses === 2 ? (
    <g fill="#fff" fillOpacity=".14" stroke={frame} strokeWidth="2.6" strokeLinejoin="round">
      <rect x="64" y="86" width="31" height="22" rx="7" /><rect x="105" y="86" width="31" height="22" rx="7" /><path d="M95 94 H105" fill="none" /><path d="M64 92 L54 90 M136 92 L146 90" fill="none" />
    </g>
  ) : (
    <g strokeLinejoin="round">
      <rect x="62" y="85" width="34" height="23" rx="8" fill={u("lens")} stroke={frame} strokeWidth="2.6" /><rect x="104" y="85" width="34" height="23" rx="8" fill={u("lens")} stroke={frame} strokeWidth="2.6" />
      <path d="M96 92 H104" stroke={frame} strokeWidth="2.6" /><path d="M62 91 L52 89 M138 91 L148 89" stroke={frame} strokeWidth="2.6" />
      <path d="M68 90 L78 90 M110 90 L120 90" stroke="#fff" strokeWidth="2" opacity=".35" strokeLinecap="round" />
    </g>
  );

  const beardEl = [
    null,
    <path key="b1" d="M55 100 Q54 140 100 152 Q146 140 145 100 Q140 128 100 132 Q60 128 55 100Z" fill={shade(hair, -0.1)} opacity=".3" />,
    <path key="b2" d="M82 120 Q92 113 100 117 Q108 113 118 120 Q110 124 100 122 Q90 124 82 120Z" fill={u("hair")} />,
    <g key="b3"><path d="M53 98 Q48 146 100 158 Q152 146 147 98 Q140 120 100 118 Q60 120 53 98Z" fill={u("hair")} /><path d="M82 121 Q92 114 100 118 Q108 114 118 121 Q110 125 100 123 Q90 125 82 121Z" fill={shade(hair, -0.15)} /></g>,
  ][beard];

  const outfitEl = (
    <>
      {outfit === 1 && <path d="M40 176 Q38 128 100 124 Q162 128 160 176Z" fill={shade(shirt, -0.3)} />}
      <path d="M12 200 Q14 158 58 150 L100 164 L142 150 Q186 158 188 200Z" fill={u("shirt")} />
      <rect x="86" y="122" width="28" height="44" rx="13" fill={u("neck")} />
      {outfit === 0 && <path d="M76 152 Q100 176 124 152" stroke={shade(shirt, -0.3)} strokeWidth="4.5" fill="none" strokeLinecap="round" />}
      {outfit === 1 && <>
        <path d="M70 154 Q100 180 130 154" stroke={shade(shirt, -0.3)} strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M92 168 V190 M108 168 V190" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" opacity=".85" />
      </>}
      {outfit === 2 && <>
        <path d="M78 152 L100 194 L122 152 L100 166Z" fill="#f6f6f6" />
        <path d="M70 152 L100 200 L82 200 L52 164Z" fill={shade(shirt, 0.12)} /><path d="M130 152 L100 200 L118 200 L148 164Z" fill={shade(shirt, 0.12)} />
        <path d="M78 152 L100 168 L92 156Z" fill="#fff" />
      </>}
      {outfit === 3 && <path d="M80 126 Q100 138 120 126 L122 156 Q100 166 78 156Z" fill={u("shirt")} stroke={shade(shirt, -0.25)} strokeWidth="1.5" />}
    </>
  );

  const faceShape = (props: Record<string, unknown>) =>
    face === 0 ? <ellipse cx="100" cy="94" rx="48" ry="50" {...props} /> : face === 1 ? <ellipse cx="100" cy="95" rx="44" ry="54" {...props} /> : <rect x="53" y="42" width="94" height="104" rx="38" {...props} />;

  const accessoryEl = accessory === 0 ? null : accessory === 1 ? (
    <g>
      <path d="M50 96 Q48 28 100 28 Q152 28 150 96" stroke="#2b2f3a" strokeWidth="7" fill="none" strokeLinecap="round" />
      <rect x="38" y="84" width="19" height="32" rx="9" fill={u("cup")} /><rect x="143" y="84" width="19" height="32" rx="9" fill={u("cup")} />
      <rect x="44" y="92" width="7" height="16" rx="3.5" fill={shirt} /><rect x="149" y="92" width="7" height="16" rx="3.5" fill={shirt} />
    </g>
  ) : accessory === 2 ? (
    <g><circle cx="53" cy="116" r="3.6" fill="#f1b72a" stroke="#b8871a" strokeWidth=".8" /><circle cx="52" cy="115" r="1.1" fill="#fff" opacity=".8" /></g>
  ) : (
    <g>
      <path d="M46 74 Q46 22 100 20 Q154 22 154 74 Q100 62 46 74Z" fill={u("shirt")} />
      <path d="M56 66 Q100 80 160 66 Q150 78 102 78 Q70 76 56 66Z" fill={shade(shirt, -0.3)} />
      <circle cx="100" cy="21" r="4.5" fill={shade(shirt, -0.2)} />
      <ellipse cx="80" cy="38" rx="18" ry="5.5" fill="#fff" opacity=".2" transform="rotate(-14 80 38)" />
    </g>
  );

  return (
    <svg width={size} height={size} viewBox={`${view[0]} ${view[1]} ${view[2]} ${view[2]}`} role="img" aria-label="avatar" style={{ borderRadius: "50%", display: "block" }}>
      <defs>
        <linearGradient id={`${id}bg`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={shade(bg, 0.4)} /><stop offset=".6" stopColor={bg} /><stop offset="1" stopColor={shade(bg, -0.12)} /></linearGradient>
        <radialGradient id={`${id}skin`} cx=".36" cy=".3" r=".85"><stop offset="0" stopColor={skinHi} /><stop offset=".5" stopColor={skin} /><stop offset="1" stopColor={skinLo} /></radialGradient>
        <linearGradient id={`${id}neck`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={skinDeep} /><stop offset=".35" stopColor={skinLo} /><stop offset="1" stopColor={skin} /></linearGradient>
        <linearGradient id={`${id}hair`} x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stopColor={shade(hair, 0.3)} /><stop offset=".45" stopColor={hair} /><stop offset="1" stopColor={shade(hair, -0.3)} /></linearGradient>
        <linearGradient id={`${id}shirt`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={shade(shirt, 0.22)} /><stop offset=".5" stopColor={shirt} /><stop offset="1" stopColor={shade(shirt, -0.28)} /></linearGradient>
        <radialGradient id={`${id}iris`} cx=".4" cy=".35" r=".8"><stop offset="0" stopColor={shade(eyes, 0.45)} /><stop offset=".6" stopColor={eyes} /><stop offset="1" stopColor={shade(eyes, -0.45)} /></radialGradient>
        <linearGradient id={`${id}lens`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3a3f4b" /><stop offset="1" stopColor="#0f1115" /></linearGradient>
        <linearGradient id={`${id}cup`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4a4f5c" /><stop offset="1" stopColor="#1d2028" /></linearGradient>
        <radialGradient id={`${id}glow`} cx=".25" cy=".2" r=".7"><stop offset="0" stopColor="#fff" stopOpacity=".45" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
        <radialGradient id={`${id}vig`} cx=".5" cy=".5" r=".72"><stop offset=".7" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".22" /></radialGradient>
        <filter id={`${id}blur`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4" /></filter>
      </defs>

      <rect width="200" height="200" fill={u("bg")} />
      <rect width="200" height="200" fill={u("glow")} />
      {hairBack}
      {outfitEl}
      <ellipse cx="100" cy="146" rx="34" ry="10" fill={skinDeep} opacity=".45" filter={`url(#${id}blur)`} />
      <ellipse cx="53" cy="100" rx="8" ry="12" fill={u("skin")} /><ellipse cx="147" cy="100" rx="8" ry="12" fill={u("skin")} />
      <ellipse cx="53.5" cy="101" rx="3.5" ry="6.5" fill={skinLo} opacity=".6" /><ellipse cx="146.5" cy="101" rx="3.5" ry="6.5" fill={skinLo} opacity=".6" />
      {faceShape({ fill: u("skin") })}
      {faceShape({ fill: "none", stroke: skinLo, strokeWidth: 1.4, opacity: 0.35 })}
      <circle cx="70" cy="113" r="12" fill="#ff6f7a" opacity=".22" filter={`url(#${id}blur)`} /><circle cx="130" cy="113" r="12" fill="#ff6f7a" opacity=".22" filter={`url(#${id}blur)`} />
      <ellipse cx="86" cy="62" rx="15" ry="7" fill="#fff" opacity=".13" transform="rotate(-20 86 62)" />
      <ellipse cx="100" cy="113" rx="5.5" ry="3.6" fill={skinLo} opacity=".55" /><circle cx="98.5" cy="104" r="3" fill="#fff" opacity=".2" />
      {beardEl}
      {eye(lensX[0])}{eye(lensX[1])}
      {browPath(-1)}{browPath(1)}
      {mouthEl}
      {hairFront}
      {glassesEl}
      {accessoryEl}
      <rect width="200" height="200" fill={u("vig")} />
    </svg>
  );
}

type Props = { name: string; handle: string; hasPhoto: boolean; size?: number; avatar?: string };

/** Photo first, then illustrated avatar, then initials. */
export default function Avatar({ name, handle, hasPhoto, size = 72, avatar = "" }: Props) {
  const st = { width: size, height: size, fontSize: size * 0.38 };
  if (hasPhoto) return <img className="avatar" style={st} src={`/photo/${handle}`} alt={name} />;
  const cfg = parseAvatar(avatar);
  if (cfg) return <div className="avatar" style={{ ...st, padding: 0, overflow: "hidden" }}><AvatarArt cfg={cfg} size={size - 6} /></div>;
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
  return <div className="avatar" style={st}>{initials}</div>;
}
