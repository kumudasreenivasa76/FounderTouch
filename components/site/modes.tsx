"use client";
import { useEffect, useRef, useState } from "react";
import I from "@/components/icon";
import { PageMock, Phone } from "./mocks";
import { BLURB, PERSONAS } from "./personas";

/** Pick a mode on the left, the phone on the right shows that page. Cycles gently until someone picks one. */
export default function ModeShowcase() {
  const [i, setI] = useState(0);
  const touched = useRef(false);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => { if (!touched.current) setI((n) => (n + 1) % PERSONAS.length); }, 4200);
    return () => clearInterval(t);
  }, []);
  const pick = (n: number) => { touched.current = true; setI(n); };
  return (
    <div className="s-modes">
      <div className="s-modes-list" role="tablist" aria-label="Modes">
        {PERSONAS.map((p, n) => (
          <button key={p.mode} type="button" role="tab" aria-selected={n === i} className={"s-mode" + (n === i ? " on" : "")} onClick={() => pick(n)}>
            <span className="s-mode-ico"><I n={p.icon} size={18} /></span>
            <span className="s-mode-text">
              <b>{p.mode}</b>
              <span>{BLURB[p.mode]}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="s-modes-stage">
        <span className="s-modes-glow" style={{ background: PERSONAS[i].theme[0] }} aria-hidden />
        <Phone>
          <div className="s-swap" key={i}><PageMock p={PERSONAS[i]} /></div>
        </Phone>
      </div>
    </div>
  );
}
