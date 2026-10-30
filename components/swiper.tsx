"use client";
import { Children, useCallback, useEffect, useRef, useState } from "react";

/**
 * Swipeable pages. Native scroll-snap, so it feels right on touch, and tabs/dots/arrow keys work too.
 * Each pane scrolls on its own if it is taller than the screen, so the page itself never scrolls.
 * `labels[i]` names pane i; `initial` is the pane to open first.
 */
export default function Swiper({ labels, children, initial = 0, onChange, select }: { labels: string[]; children: React.ReactNode; initial?: number; onChange?: (i: number) => void; select?: boolean }) {
  const panes = Children.toArray(children);
  const track = useRef<HTMLDivElement>(null);
  const tabs = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(initial);

  const go = useCallback((n: number, smooth = true) => {
    const el = track.current;
    if (el) el.scrollTo({ left: n * el.clientWidth, behavior: smooth ? "smooth" : "auto" });
  }, []);

  // Jump to the starting page. Retried once layout has settled, because the width can still be 0 on the first pass.
  useEffect(() => {
    go(initial, false);
    const raf = requestAnimationFrame(() => go(initial, false));
    const t = setTimeout(() => go(initial, false), 150);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); };
  }, [initial, go]);
  useEffect(() => { // keep the active tab in view
    const t = tabs.current?.children[i] as HTMLElement | undefined;
    t?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [i]);

  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    const n = Math.round(el.scrollLeft / el.clientWidth);
    if (n !== i) { setI(n); onChange?.(n); }
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") go(Math.min(i + 1, panes.length - 1));
    if (e.key === "ArrowLeft") go(Math.max(i - 1, 0));
  };

  return (
    <div className="swiper" onKeyDown={onKey}>
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
        {panes.map((p, n) => <section className="pane" key={n} aria-hidden={n !== i}>{p}</section>)}
      </div>
      <div className="swiper-dots" aria-hidden>{panes.map((_, n) => <i key={n} className={n === i ? "on" : ""} />)}</div>
    </div>
  );
}
