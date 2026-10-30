"use client";
import { useState } from "react";

export default function ShareButtons({ url, title }: { url: string; title: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); } catch { prompt("Copy this link", url); }
    setDone(true); setTimeout(() => setDone(false), 1800);
  };
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title, url }); } catch {} } else copy();
  };
  return (
    <div className="row" style={{ marginTop: 12 }}>
      <button type="button" className="ghost" onClick={copy}>{done ? "Copied ✓" : "Copy link"}</button>
      <button type="button" onClick={share}>Share</button>
    </div>
  );
}
