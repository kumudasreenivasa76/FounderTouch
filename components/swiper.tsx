"use client";
import { Children, useCallback, useEffect, useRef, useState } from "react";

/**
 * Swipeable pages. Native scroll-snap, so it feels right on touch, and tabs/dots/arrow keys work too.
 * Each pane scrolls on its own if it is taller than the screen, so the page itself never scrolls.
 * `labels[i]` names pane i; `initial` is the pane to open first.
 */
export default function Swiper({ labels, children, initial = 0, onChange, select, main, heading }: { labels: string[]; children: React.ReactNode; initial?: number; onChange?: (i: number) => void; select?: boolean; main?: boolean; heading?: string }) {
  const panes = Children.toArray(children);
  const track = useRef<HTMLDivElement>(null);
  const tabs = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(initial);
  const cur = useRef(initial);        // current pane, readable inside event handlers
  const lastUser = useRef(0);         // when the visitor last touched, clicked or pressed a key
  const want = useRef(initial);       // the pane the page is meant to show
  cur.current = i;

  const go = useCallback((n: number, smooth = true) => {
    const el = track.current;
    want.current = n;
    if (el) el.scrollTo({ left: n * el.clientWidth, behavior: smooth ? "smooth" : "auto" });
  }, []);

  // Jump to the starting page. Retried once layout has settled, because the width can still be 0 on the first pass.
  useEffect(() => {
    go(initial, false);
    const raf = requestAnimationFrame(() => go(initial, false));
    const t = setTimeout(() => go(initial, false), 150);
    // Embedded viewers can pull the page sideways while they load; settle back unless the visitor has moved.
    const settle = [700, 1600].map((ms) => setTimeout(() => { if (Date.now() - lastUser.current > 1200) go(want.current, false); }, ms));
    return () => { cancelAnimationFrame(raf); clearTimeout(t); settle.forEach(clearTimeout); };
  }, [initial, go]);
  useEffect(() => { // keep the active tab in view
    const t = tabs.current?.children[i] as HTMLElement | undefined;
    t?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [i]);

  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    // A scroll nobody asked for (an embedded viewer taking focus on load) is undone.
    const n = Math.round(el.scrollLeft / el.clientWidth);
    if (Date.now() - lastUser.current > 1200 && n !== want.current) { go(want.current, false); return; }
    want.current = n; // the visitor moved on purpose: this is where they want to be
    if (n !== i) { setI(n); onChange?.(n); }
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") go(Math.min(i + 1, panes.length - 1));
    if (e.key === "ArrowLeft") go(Math.max(i - 1, 0));
  };

  const touched = () => { lastUser.current = Date.now(); };

  return (
    <div className="swiper" onKeyDown={(e) => { touched(); onKey(e); }} onPointerDown={touched} onTouchStart={touched} onWheel={touched} {...(main ? { role: "main", id: "main" } : {})}>
      {heading && <h1 className="sr-only">{heading}</h1>}
      {select ? (
        <div className="swiper-select">
          <select value={i} onChange={(e) => go(Number(e.target.value))} aria-label="Choose a page">
            {labels.map((l, n) => <option key={l + n} value={n}>{l}</option>)}
          </select>
        </div>
      ) : (
        <div className="swiper-tabs" ref={tabs} role="tablist">
          {labels.map((l, n) => (
            <button key={l} type="button" role="tab" aria-selected={n === i} className={n === i ? "on" : ""} onClick={() => go(n)}>{l}</button>
          ))}
        </div>
      )}
      <div className="swiper-track" ref={track} onScroll={onScroll} tabIndex={0}>
        {panes.map((p, n) => <section className="pane" key={n} inert={n !== i}>{p}</section>)}
      </div>
      <div className="swiper-dots" aria-hidden>{panes.map((_, n) => <i key={n} className={n === i ? "on" : ""} />)}</div>
    </div>
  );
}
