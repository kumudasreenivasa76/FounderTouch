type Props = { name: string; handle: string; hasPhoto: boolean; size?: number; avatar?: string; flip?: boolean; center?: boolean };

/** The profile picture: the uploaded photo, or initials until one is added. */
export default function Avatar({ name, handle, hasPhoto, size = 72 }: Props) {
  const st = { width: size, height: size, fontSize: size * 0.38 };
  if (hasPhoto) return <img className="avatar" style={st} src={`/photo/${handle}`} alt={name} />;
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
  return <div className="avatar" style={st}>{initials}</div>;
}
