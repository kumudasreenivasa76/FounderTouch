"use client";
import { useEffect, useState } from "react";
import { slugFree } from "../actions";

/** tapnodd.com/ + your address, with a live "free / taken" check. Empty keeps the standard address. */
export default function SlugField({ initial, fallback }: { initial: string; fallback: string }) {
  const [v, setV] = useState(initial);
  const [st, setSt] = useState<"" | "ok" | "bad" | "taken">("");
  useEffect(() => {
    if (!v) { setSt(""); return; }
    const t = setTimeout(() => { slugFree(v).then(setSt); }, 350);
    return () => clearTimeout(t);
  }, [v]);
  return (
    <>
      <div className="d-slug">
        <span className="d-slug-pre">tapnodd.com/</span>
        <label className="d-field" style={{ flex: 1, margin: 0 }}>
          <span className="sr-only">Card address</span>
          <input name="slug" value={v} onChange={(e) => setV(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder={fallback} maxLength={30} aria-describedby="slug-st" />
          {st === "ok" && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></svg>}
        </label>
      </div>
      <span id="slug-st" className="d-t2" role="status" style={{ color: st === "taken" || st === "bad" ? "#BE123C" : undefined }}>
        {st === "ok" ? "This address is free." : st === "taken" ? "That address is taken." : st === "bad" ? "Use 3 to 30 letters, numbers or dashes." : `Leave empty to keep tapnodd.com/${fallback}`}
      </span>
    </>
  );
}
