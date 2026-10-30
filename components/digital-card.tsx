"use client";
import { useState } from "react";

export type CardLine = { icon: string; text: string; href: string };

/**
 * A digital business card that flips between front and back.
 * The avatar is passed in already rendered; everything else is plain data.
 */
export default function DigitalCard({
  background, back, avatar, name, sub, badge, qr, lines, social,
}: {
  background: string; back: string; avatar: React.ReactNode; name: string; sub: string; badge: string; qr: string;
  lines: CardLine[]; social: React.ReactNode;
}) {
  const [flipped, setFlipped] = useState(false);
  const toggle = (e: React.MouseEvent) => { if (!(e.target as HTMLElement).closest("a")) setFlipped((f) => !f); };
  return (
    <div>
      <div className={"flip" + (flipped ? " flipped" : "")} onClick={toggle} role="button" tabIndex={0} aria-label="Flip the card"
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFlipped((f) => !f); } }}>
        <div className="flip-in">
          <div className="face front" style={{ background }}>
            <div className="face-top">{avatar}<span className="dcard-mode">{badge}</span></div>
            <div className="face-name">{name}</div>
            {sub && <div className="face-sub">{sub}</div>}
            <div className="face-qr"><img src={qr} alt="QR code to open this card" /></div>
          </div>
          <div className="face backside" style={{ background: back }}>
            <div className="face-name" style={{ fontSize: 17 }}>{name}</div>
            <div className="face-lines">
              {lines.length === 0 && <div style={{ opacity: 0.85 }}>Add a phone, email or website in Profile to show it here.</div>}
              {lines.map((l) => (
                <a key={l.text} href={l.href} target={l.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"><span>{l.icon}</span>{l.text}</a>
              ))}
            </div>
            <div className="face-social">{social}</div>
          </div>
        </div>
      </div>
      <button type="button" className="ghost" onClick={() => setFlipped((f) => !f)} style={{ marginTop: 10 }}>↻ Flip card</button>
    </div>
  );
}
