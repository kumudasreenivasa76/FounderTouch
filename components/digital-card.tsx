"use client";
import { useState } from "react";
import Icon from "@/components/icon";

export type CardLine = { icon: string; text: string; href: string };

/**
 * A digital business card that flips between front and back.
 * The avatar is passed in already rendered; everything else is plain data.
 */
export default function DigitalCard({
  background, back, avatar, name, sub, qr, logo, lines, social, onTap,
}: {
  background: string; back: string; avatar: React.ReactNode; name: string; sub: string; qr?: string; logo?: string;
  lines: CardLine[]; social: React.ReactNode; onTap?: () => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const toggle = (e: React.MouseEvent) => { if ((e.target as HTMLElement).closest("a")) return; if (onTap) onTap(); else setFlipped((f) => !f); };
  return (
    <div>
      <div className={"flip" + (flipped ? " flipped" : "")} onClick={toggle}>
        <div className="flip-in">
          <div className="face front" style={{ background }} inert={flipped}>
            <div className="face-top">{avatar}{logo && <img className="face-logo" src={logo} alt="" />}</div>
            <div className="face-name">{name}</div>
            {sub && <div className="face-sub">{sub}</div>}
            {qr ? <div className="face-qr"><img src={qr} alt="QR code to open this card" /></div> : <div className="face-hint">{onTap ? "Tap for QR & share ▦" : "Tap to flip ↻"}</div>}
          </div>
          <div className="face backside" style={{ background: back }} inert={!flipped}>
            <div className="face-name" style={{ fontSize: 17 }}>{name}</div>
            <div className="face-lines">
              {lines.length === 0 && <div style={{ opacity: 0.85 }}>Add a phone, email or website in Profile to show it here.</div>}
              {lines.map((l) => (
                <a key={l.text} href={l.href} target={l.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"><span><Icon name={l.icon} size={16} /></span>{l.text}</a>
              ))}
            </div>
            <div className="face-social">{social}</div>
          </div>
        </div>
      </div>
      <button type="button" className="ghost" onClick={() => setFlipped((f) => !f)} aria-pressed={flipped} style={{ marginTop: 10 }}>↻ Flip card</button>
    </div>
  );
}
