"use client";
import { useState } from "react";

const Ico = ({ d }: { d: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
);

/** The page's own address, ready to copy or send. */
export default function PageLink({ url, title }: { url: string; title: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); } catch { prompt("Copy this link", url); }
    setDone(true); setTimeout(() => setDone(false), 1800);
  };
  const share = async () => { if (navigator.share) { try { await navigator.share({ title, url }); return; } catch { return; } } copy(); };
  return (
    <div className="pl">
      <div className="pl-label">Link to this page</div>
      <div className="pl-row">
        <span className="pl-url" title={url}>{url.replace(/^https?:\/\//, "")}</span>
        <button type="button" className={"pl-btn" + (done ? " ok" : "")} onClick={copy} aria-label="Copy link">
          {done ? <Ico d="M5 12.5l4.5 4.5L19 7.5" /> : <Ico d="M9 9h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2zM5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />}
          <span>{done ? "Copied" : "Copy"}</span>
        </button>
        <button type="button" className="pl-btn pl-share" onClick={share} aria-label="Share link">
          <Ico d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
          <span>Share</span>
        </button>
      </div>
    </div>
  );
}
