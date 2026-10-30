"use client";
import { useEffect, useRef, useState } from "react";
import type { Found } from "@/app/app/tap-actions";

type Ndef = {
  write: (m: { records: { recordType: string; data: string }[] }) => Promise<void>;
  scan: (o?: { signal?: AbortSignal }) => Promise<void>;
  onreading: ((e: { message: { records: { recordType: string; data: BufferSource }[] } }) => void) | null;
  onreadingerror: (() => void) | null;
};
type Page = { mode: string; label: string; icon: string; tapUrl: string };

/**
 * Tap to share. A radar that searches for people nearby: it listens for NFC cards, stickers and phones,
 * shows who it found, and lets you write your own link to a tag or send it with your phone's share sheet.
 */
export default function TapShare({ pages, avatar, peek, save }: {
  pages: Page[]; avatar: React.ReactNode;
  peek: (raw: string) => Promise<Found>; save: (handle: string, mode: string) => Promise<{ ok: boolean; own?: boolean }>;
}) {
  const [mode, setMode] = useState(pages[0]?.mode);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [state, setState] = useState<"idle" | "listening" | "found" | "error">("idle");
  const [found, setFound] = useState<Extract<Found, { ok: true }> | null>(null);
  const [msg, setMsg] = useState("");
  const [saved, setSaved] = useState(false);
  const [bursts, setBursts] = useState(0);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => { setSupported("NDEFReader" in window); return () => abort.current?.abort(); }, []);

  const cur = pages.find((p) => p.mode === mode) ?? pages[0];
  const NDEF = () => (window as unknown as { NDEFReader: new () => Ndef }).NDEFReader;
  const buzz = (p: number | number[]) => { try { navigator.vibrate?.(p); } catch { /* not available */ } };

  const stop = () => { abort.current?.abort(); setState("idle"); setMsg(""); };

  const start = async () => {
    setFound(null); setSaved(false); setMsg("");
    abort.current?.abort(); abort.current = new AbortController();
    if (!supported) { setState("error"); setMsg("This browser can't listen for NFC. Use Chrome on Android, or send your link with the share sheet below."); return; }
    try {
      const r = new (NDEF())();
      await r.scan({ signal: abort.current.signal });
      buzz(25);
      setState("listening");
      r.onreadingerror = () => setMsg("Couldn't read that one. Hold it a little closer.");
      r.onreading = async (e) => {
        const rec = e.message.records.find((x) => x.recordType === "url" || x.recordType === "text");
        const text = rec ? new TextDecoder().decode(rec.data) : "";
        const res = await peek(text);
        if (res.ok) { setFound(res); setState("found"); setBursts((b) => b + 1); buzz([40, 60, 40, 60, 90]); abort.current?.abort(); }
        else setMsg("That tag isn't a FounderTouch card. Keep searching…");
      };
    } catch (err) {
      setState("error");
      setMsg(err instanceof Error && err.name === "NotAllowedError" ? "NFC permission was denied. Allow it in your browser settings." : "Couldn't start NFC. Check that NFC is switched on.");
    }
  };

  const writeTag = async () => {
    stop();
    setMsg("Hold the back of your phone against the card or sticker…");
    try {
      await new (NDEF())().write({ records: [{ recordType: "url", data: cur.tapUrl }] });
      buzz([30, 40, 30]); setMsg(`Written. Anyone who taps it opens your ${cur.label} page.`);
    } catch { setMsg("Couldn't write to the tag. Hold it closer and try again."); }
  };
  const shareSheet = async () => {
    if (navigator.share) { try { await navigator.share({ title: "My FounderTouch card", url: cur.tapUrl }); } catch { /* cancelled */ } }
    else { try { await navigator.clipboard.writeText(cur.tapUrl); setMsg("Link copied. Paste it into any chat."); } catch { setMsg(cur.tapUrl); } }
  };
  const doSave = async () => {
    if (!found) return;
    const r = await save(found.handle, found.mode);
    if (r.ok) { setSaved(true); buzz(30); } else setMsg(r.own ? "That's your own card." : "Couldn't save that card.");
  };

  const live = state === "listening";
  return (
    <div>
      <div className={"radar" + (live ? " live" : "") + (state === "found" ? " done" : "")} aria-live="polite">
        <i className="ring" /><i className="ring" /><i className="ring" />
        <div className="radar-core">{avatar}</div>
        {state === "found" && <div className="burst" key={bursts} aria-hidden>{Array.from({ length: 14 }).map((_, i) => <i key={i} style={{ ["--a" as string]: `${i * (360 / 14)}deg`, ["--h" as string]: `${(i * 47) % 360}` }} />)}</div>}
      </div>

      {state === "found" && found ? (
        <div className="card found-card">
          <div className="found-ini">{found.initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="muted" style={{ fontSize: 12 }}>🎉 Found someone</div>
            <b style={{ fontSize: 18 }}>{found.name}</b>
            <div className="muted">{found.sub || found.modeLabel}</div>
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <button type="button" onClick={doSave} disabled={saved} style={{ width: "auto", padding: "8px 14px" }}>{saved ? "✓ Saved" : "Save card"}</button>
            <a className="btn ghost" style={{ width: "auto", padding: "8px 14px" }} href={`/${found.handle}?mode=${found.mode}`} target="_blank">Open</a>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <h2 style={{ margin: "0 0 4px" }}>{live ? "Searching for people nearby…" : "Tap to share"}</h2>
          <div className="muted">{live ? "Hold the back of your phone against an NFC card, sticker or phone." : "Meet someone? Start tapping, then touch phones or cards."}</div>
        </div>
      )}

      <div style={{ margin: "0 0 10px" }}>
        {live
          ? <button type="button" className="ghost" onClick={stop}>Stop searching</button>
          : <button type="button" className={state === "found" ? "ghost" : "pulse"} onClick={start} disabled={supported === null}>{state === "found" ? "Find someone else" : "📲 Start tapping"}</button>}
      </div>
      {msg && <p className={state === "error" ? "err" : "muted"} style={{ textAlign: "center" }}>{msg}</p>}

      <div className="card">
        <b>What do you want to share?</b>
        <div className="chips" style={{ marginTop: 8 }}>
          {pages.map((p) => (
            <button key={p.mode} type="button" onClick={() => setMode(p.mode)} className={"pill" + (p.mode === cur.mode ? " on" : "")} style={{ border: 0, width: "auto", fontWeight: 400, cursor: "pointer" }}>{p.icon} {p.label}</button>
          ))}
        </div>
        <div className="row" style={{ marginTop: 6 }}>
          <button type="button" className="ghost" onClick={shareSheet}>📤 Send to a phone</button>
          {supported && <button type="button" className="ghost" onClick={writeTag}>🏷️ Write to a tag</button>}
        </div>
        <p className="muted" style={{ margin: "8px 0 0", fontSize: 12.5 }}>
          Searching works with NFC cards and stickers, and with phones that share a tap link. Sending to a phone uses your phone&apos;s own share sheet (Nearby Share or AirDrop). Browsers can&apos;t beam to another phone directly.
        </p>
      </div>
    </div>
  );
}
