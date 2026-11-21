"use client";
import { useEffect, useState } from "react";

type Pref = "light" | "dark" | "system";
const OPTIONS: { v: Pref; label: string }[] = [{ v: "light", label: "Light" }, { v: "dark", label: "Dark" }, { v: "system", label: "Auto" }];

/** Applies a theme choice to the page right away. "system" follows the phone or computer setting. */
export function applyTheme(p: Pref) {
  const light = p === "light" || (p === "system" && window.matchMedia("(prefers-color-scheme: light)").matches);
  document.documentElement.dataset.theme = light ? "light" : "dark";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", light ? "#f3f4f8" : "#0b0d14");
}

/** Light, Dark or Auto. Saved in a cookie so the server renders the right theme on the next visit. */
export default function ThemeSwitch({ initial }: { initial: Pref }) {
  const [pref, setPref] = useState<Pref>(initial);
  useEffect(() => {
    if (pref !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const on = () => applyTheme("system");
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [pref]);
  const pick = (p: Pref) => {
    setPref(p);
    document.cookie = `theme=${p}; path=/; max-age=31536000; samesite=lax`;
    applyTheme(p);
  };
  return (
    <div className="seg theme-seg" role="radiogroup" aria-label="Appearance">
      {OPTIONS.map((o) => (
        <button key={o.v} type="button" role="radio" aria-checked={pref === o.v} className={pref === o.v ? "on" : ""} onClick={() => pick(o.v)}>{o.label}</button>
      ))}
    </div>
  );
}
