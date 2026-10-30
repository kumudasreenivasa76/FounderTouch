"use client";
import { useState } from "react";

/** One dropdown instead of a row of buttons: choose a mode, then open that page. */
export default function OpenPage({ handle, options }: { handle: string; options: { value: string; label: string }[] }) {
  const [v, setV] = useState(options[0]?.value ?? "ALL");
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", textAlign: "left" }}>
      <select value={v} onChange={(e) => setV(e.target.value)} aria-label="Choose which page to open" style={{ margin: 0, flex: 1, fontWeight: 600 }}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <button type="button" onClick={() => window.open(`/${handle}?mode=${encodeURIComponent(v)}`, "_blank", "noopener")} style={{ width: "auto", flexShrink: 0, padding: "11px 16px" }}>Open ↗</button>
    </div>
  );
}
