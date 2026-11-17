"use client";
import { useState } from "react";
import { SOCIALS } from "@/lib/socials";
import { SocialBadge } from "./social-icon";

const short = (label: string) => label.replace(/ \(.*\)$/, "");

/**
 * Social links as a row of brand icons. Tap an icon to add or edit its link; icons with a link stay in colour
 * and carry a tick. Values submit with the surrounding form as social_<key>.
 */
export default function SocialList({ initial }: { initial: Record<string, string | undefined> }) {
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(SOCIALS.map((s) => [s.key, initial[s.key] ?? ""])));
  const [active, setActive] = useState<string | null>(null);
  const cur = SOCIALS.find((s) => s.key === active);
  const added = SOCIALS.filter((s) => vals[s.key].trim()).length;

  return (
    <div className="so">
      {SOCIALS.map((s) => <input key={s.key} type="hidden" name={"social_" + s.key} value={vals[s.key]} />)}

      <div className="so-head">
        <b className="kit-group-t" style={{ flex: 1 }}>Socials and portfolio</b>
        <span className="so-n">{added} of {SOCIALS.length} added</span>
      </div>

      <div className="so-icons" role="group" aria-label="Social links">
        {SOCIALS.map((s) => {
          const filled = !!vals[s.key].trim(), on = active === s.key;
          return (
            <button key={s.key} type="button" className={"so-ic" + (filled ? " filled" : "") + (on ? " on" : "")} aria-pressed={on}
              aria-label={`${short(s.label)}${filled ? ", added" : ", not added"}`} onClick={() => setActive(on ? null : s.key)}>
              <SocialBadge k={s.key} size={46} />
              {filled && <i aria-hidden><svg viewBox="0 0 16 16" width="10" height="10"><path d="M3.5 8.5l3 3 6-6.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg></i>}
              <span>{short(s.label)}</span>
            </button>
          );
        })}
      </div>

      {cur ? (
        <div className="so-edit">
          <label htmlFor={"so-" + cur.key}>{short(cur.label)} link</label>
          <input id={"so-" + cur.key} key={cur.key} autoFocus value={vals[cur.key]} placeholder={cur.ph} inputMode={cur.key === "whatsapp" ? "tel" : "url"} autoCapitalize="none" autoCorrect="off" spellCheck={false}
            onChange={(e) => setVals({ ...vals, [cur.key]: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setActive(null); } }} />
          <div className="so-edit-row">
            {vals[cur.key].trim() && <button type="button" className="so-rm" onClick={() => { setVals({ ...vals, [cur.key]: "" }); setActive(null); }}>Remove</button>}
            <button type="button" className="so-done" onClick={() => setActive(null)}>Done</button>
          </div>
        </div>
      ) : (
        <p className="kit-note" style={{ marginTop: 10 }}>Tap an icon to add or change its link. A handle such as @you works too.</p>
      )}
    </div>
  );
}
