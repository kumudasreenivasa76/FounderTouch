"use client";
import { Children, useEffect, useRef, useState } from "react";

type Item = { label: string; sub: string; card: React.ReactNode };

/**
 * A swipeable deck of cards, one per mode, in the style of HiHello. The card in the middle is the one you are
 * working on; its neighbours peek in from the sides. Whatever is selected decides which panel shows below.
 */
export default function ModeDeck({ items, children, initial = 0 }: { items: Item[]; children: React.ReactNode; initial?: number }) {
  const panels = Children.toArray(children);
  const track = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(Math.min(initial, items.length - 1));
  const lock = useRef(false);

  const step = () => {
    const el = track.current;
    const first = el?.children[0] as HTMLElement | undefined;
    const second = el?.children[1] as HTMLElement | undefined;
    return first && second ? second.offsetLeft - first.offsetLeft : first?.offsetWidth ?? 1;
  };
  const go = (n: number, smooth = true) => {
    const el = track.current;
    if (!el) return;
    lock.current = true;
    el.scrollTo({ left: n * step(), behavior: smooth ? "smooth" : "auto" });
    setI(n);
    setTimeout(() => { lock.current = false; }, 450);
  };
  useEffect(() => { go(initial, false); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const onScroll = () => {
    if (lock.current) return;
    const el = track.current;
    if (!el) return;
    const n = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollLeft / step())));
    if (n !== i) setI(n);
  };
  const cur = items[i];

  return (
    <div className="deck">
      <div className="deck-track" ref={track} onScroll={onScroll} role="listbox" aria-label="Your cards" tabIndex={0}
        onKeyDown={(e) => { if (e.key === "ArrowRight") go(Math.min(i + 1, items.length - 1)); if (e.key === "ArrowLeft") go(Math.max(i - 1, 0)); }}>
        {items.map((it, n) => (
          <div key={it.label + n} className={"deck-item" + (n === i ? " on" : "")} role="option" aria-selected={n === i}
            onClick={(e) => { if (n !== i) { e.preventDefault(); e.stopPropagation(); go(n); } }}>
            <div className="deck-card" inert={n !== i}>{it.card}</div>
          </div>
        ))}
      </div>
      <div className="deck-meta">
        <b>{cur.label}</b>
        <span>{cur.sub}</span>
      </div>
      <div className="deck-dots" role="tablist" aria-label="Choose a card">
        {items.map((it, n) => <button key={it.label + n} type="button" role="tab" aria-selected={n === i} aria-label={it.label} className={n === i ? "on" : ""} onClick={() => go(n)} />)}
      </div>
      <div key={i} className="deck-panel">{panels[i]}</div>
    </div>
  );
}
