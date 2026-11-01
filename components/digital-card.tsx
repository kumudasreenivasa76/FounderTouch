"use client";
import { useRef, useState } from "react";
import I from "@/components/icon";

export type CardLine = { icon: string; text: string; href: string };

/**
 * A digital business card that flips between front and back.
 * The avatar is passed in already rendered; everything else is plain data.
 */
export default function DigitalCard({
  background, back, avatar, name, sub, qr, logo, lines, social,
}: {
  background: string; back: string; avatar: React.ReactNode; name: string; sub: string; qr?: string; logo?: string;
  lines: CardLine[]; social: React.ReactNode;
}) {
  const [flipped, setFlipped] = useState(false);
  const toggle = (e: React.MouseEvent) => { if (!(e.target as HTMLElement).closest("a")) setFlipped((f) => !f); };

  // Tilt toward a mouse or pen and let the light follow it. Touch is left alone so the page still scrolls.
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const tilt = (e: React.PointerEvent) => {
    if (e.pointerType === "touch" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.classList.add("tilting");
      el.style.setProperty("--ry", `${(x - 0.5) * 14}deg`);
      el.style.setProperty("--rx", `${(0.5 - y) * 10}deg`);
      el.style.setProperty("--mx", `${(flipped ? 1 - x : x) * 100}%`);
      el.style.setProperty("--my", `${y * 100}%`);
      el.style.setProperty("--glare", "1");
    });
  };
  const rest = () => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(frame.current);
    el.classList.remove("tilting");
    ["--ry", "--rx", "--mx", "--my", "--glare"].forEach((v) => el.style.removeProperty(v));
  };
  return (
    <div>
      <div ref={ref} className={"flip" + (flipped ? " flipped" : "")} onClick={toggle} onPointerMove={tilt} onPointerLeave={rest} role="button" tabIndex={0} aria-label="Flip the card"
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFlipped((f) => !f); } }}>
        <div className="flip-in">
          <div className="face front" style={{ background }}>
            <span className="shine" aria-hidden />
            <div className="face-top">{avatar}{logo && <img className="face-logo" src={logo} alt="" />}</div>
            <div className="face-name">{name}</div>
            {sub && <div className="face-sub">{sub}</div>}
            {qr ? <div className="face-qr"><img src={qr} alt="QR code to open this card" /></div> : <div className="face-hint"><I n="flip" size={13} /> Tap to flip</div>}
          </div>
          <div className="face backside" style={{ background: back }}>
            <div className="face-name" style={{ fontSize: 17 }}>{name}</div>
            <div className="face-lines">
              {lines.length === 0 && <div style={{ opacity: 0.85 }}>Add a phone, email or website in Profile to show it here.</div>}
              {lines.map((l) => (
                <a key={l.text} href={l.href} target={l.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"><I n={l.icon} />{l.text}</a>
              ))}
            </div>
            <div className="face-social">{social}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
