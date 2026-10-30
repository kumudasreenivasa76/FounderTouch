"use client";
import { Children, useState } from "react";

/** A mode dropdown that shows one panel at a time. */
export default function ModePanels({ labels, children, initial = 0, title }: { labels: string[]; children: React.ReactNode; initial?: number; title: string }) {
  const panels = Children.toArray(children);
  const [i, setI] = useState(Math.min(initial, panels.length - 1));
  return (
    <div>
      <label className="f" style={{ marginTop: 0 }}>{title}</label>
      <select value={i} onChange={(e) => setI(Number(e.target.value))} aria-label={title} style={{ fontWeight: 600, marginBottom: 14 }}>
        {labels.map((l, n) => <option key={l + n} value={n}>{l}</option>)}
      </select>
      <div key={i}>{panels[i]}</div>
    </div>
  );
}
