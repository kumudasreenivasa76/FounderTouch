import I from "@/components/icon";

/** Unsplash photo at a given width. */
export const photo = (id: string, w = 800) => `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;
/** A square crop centred on the person's face, for round avatars. */
export const face = (id: string, w = 200) => `https://images.unsplash.com/photo-${id}?w=${w}&h=${w}&q=80&auto=format&fit=crop&crop=faces`;

export type Persona = {
  name: string; role: string; face: string; theme: [string, string];
  mode: string; icon: string; cta: string;
  facts: [string, string][]; files: string[]; status?: string;
};

/** A phone in a thin graphite frame. */
export function Phone({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={"s-phone " + className}>
      <div className="s-phone-screen">
        <div className="s-phone-notch" aria-hidden />
        {children}
      </div>
    </div>
  );
}

/** The public page a visitor sees after scanning, drawn from the real page layout. */
export function PageMock({ p }: { p: Persona }) {
  return (
    <div className="s-page">
      <div className="s-page-hero" style={{ background: `linear-gradient(150deg, ${p.theme[0]}, ${p.theme[1]})` }}>
        <img className="s-page-face" src={face(p.face, 200)} alt="" />
        <div className="s-page-name">{p.name}</div>
        <div className="s-page-role">{p.role}</div>
        <span className="s-page-mode"><I n={p.icon} size={12} /> {p.mode}</span>
        {p.status && <span className="s-page-status"><span className="dot-live" /> {p.status}</span>}
        <div className="s-page-cta">{p.cta}</div>
      </div>
      <div className="s-page-body">
        {p.facts.map(([k, v]) => (
          <div className="s-page-fact" key={k}><span>{k}</span><b>{v}</b></div>
        ))}
        {p.files.map((f) => (
          <div className="s-page-file" key={f}><I n="file" size={15} /> {f} <I n="external" size={13} /></div>
        ))}
      </div>
    </div>
  );
}

/** The business card, front side. */
export function CardMock({ p, qr }: { p: Persona; qr?: string }) {
  return (
    <div className="s-card" style={{ background: `linear-gradient(145deg, ${p.theme[0]}, ${p.theme[1]})` }}>
      <span className="s-card-light" aria-hidden />
      <div className="s-card-top">
        <img src={face(p.face, 160)} alt="" />
        <span className="s-card-brand">ft</span>
      </div>
      <div className="s-card-name">{p.name}</div>
      <div className="s-card-role">{p.role}</div>
      {qr && <div className="s-card-qr"><img src={qr} alt={`QR code that opens ${p.name}'s live demo card`} /></div>}
    </div>
  );
}
