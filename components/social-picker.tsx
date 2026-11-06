"use client";
import { useState } from "react";
import { SOCIALS } from "@/lib/socials";
import { SocialBadge } from "./social-icon";

/**
 * Row of social icons. Tap one to open a field for its link.
 * Icons with a link stay in colour; empty ones are greyed out.
 * Values submit with the surrounding form as social_<key>.
 */
export default function SocialPicker({ initial }: { initial: Record<string, string | undefined> }) {
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(SOCIALS.map((s) => [s.key, initial[s.key] ?? ""])));
  const [active, setActive] = useState<string | null>(null);
  const cur = SOCIALS.find((s) => s.key === active);

  return (
    <div>
      {SOCIALS.map((s) => <input key={s.key} type="hidden" name={"social_" + s.key} value={vals[s.key]} />)}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, margin: "6px 0 10px" }}>
        {SOCIALS.map((s) => {
          const filled = !!vals[s.key].trim(), on = active === s.key;
          return (
            <button key={s.key} type="button" title={s.label} aria-label={`${s.label}${filled ? " (added)" : ""}`} aria-pressed={on}
              onClick={() => setActive(on ? null : s.key)}
              style={{ width: 48, height: 48, padding: 0, background: "none", position: "relative", borderRadius: "50%", outline: on ? "3px solid #3b5bdb" : "none", outlineOffset: 2, opacity: filled || on ? 1 : 0.4, filter: filled || on ? "none" : "grayscale(1)" }}>
              <SocialBadge k={s.key} size={48} />
              {filled && <span style={{ position: "absolute", right: -2, top: -2, width: 16, height: 16, borderRadius: "50%", background: "#0ca678", color: "#fff", fontSize: 10, lineHeight: "16px", border: "2px solid #fff" }}>✓</span>}
            </button>
          );
        })}
      </div>
      {cur ? (
        <div className="card" style={{ background: "#f6f7f9", marginBottom: 6 }}>
          <label className="f" style={{ marginTop: 0 }}>{cur.label} link</label>
          <input autoFocus value={vals[cur.key]} placeholder={cur.ph} inputMode={cur.key === "whatsapp" ? "tel" : "url"} autoCapitalize="none" autoCorrect="off"
            onChange={(e) => setVals({ ...vals, [cur.key]: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setActive(null); } }} />
          <div className="row">
            <button type="button" className="ghost" onClick={() => { setVals({ ...vals, [cur.key]: "" }); setActive(null); }}>Remove</button>
            <button type="button" onClick={() => setActive(null)}>Done</button>
          </div>
        </div>
      ) : (
        <p className="muted" style={{ margin: "0 0 6px" }}>Tap an icon to add your link. A handle like @you works too.</p>
      )}
    </div>
  );
}
