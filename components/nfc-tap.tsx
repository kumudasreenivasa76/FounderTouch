"use client";
import { useEffect, useRef, useState } from "react";

type Ndef = {
  write: (m: { records: { recordType: string; data: string }[] }) => Promise<void>;
  scan: (o?: { signal?: AbortSignal }) => Promise<void>;
  onreading: ((e: { message: { records: { recordType: string; data: ArrayBuffer }[] } }) => void) | null;
  onreadingerror: (() => void) | null;
};
type NdefCtor = new () => Ndef;

/** Tap screen: pick a mode, write its tap link to an NFC card or sticker, then verify it by reading it back. */
export default function NfcTap({ links }: { links: { mode: string; label: string; url: string }[] }) {
  const [mode, setMode] = useState(links[0]?.mode);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [state, setState] = useState<"idle" | "writing" | "reading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const abort = useRef<AbortController | null>(null);
  useEffect(() => { setSupported("NDEFReader" in window); return () => abort.current?.abort(); }, []);
  const cur = links.find((l) => l.mode === mode) ?? links[0];
  const NDEF = () => (window as unknown as { NDEFReader: NdefCtor }).NDEFReader;

  const fail = (e: unknown) => {
    setState("error");
    setMsg(e instanceof Error && e.name === "NotAllowedError" ? "NFC permission was denied. Allow it in your browser settings." : "That didn't work. Hold the tag closer to the back of your phone and try again.");
  };
  const write = async () => {
    setState("writing"); setMsg("Hold the back of your phone against the card or sticker…");
    try {
      await new (NDEF())().write({ records: [{ recordType: "url", data: cur.url }] });
      setState("done"); setMsg(`Written. Tapping it now opens your ${cur.label} page.`);
    } catch (e) { fail(e); }
  };
  const verify = async () => {
    setState("reading"); setMsg("Tap the card or sticker to check what is on it…");
    abort.current?.abort(); abort.current = new AbortController();
    try {
      const r = new (NDEF())();
      await r.scan({ signal: abort.current.signal });
      r.onreadingerror = () => { setState("error"); setMsg("Couldn't read that tag."); };
      r.onreading = (e) => {
        const rec = e.message.records.find((x) => x.recordType === "url" || x.recordType === "text");
        const text = rec ? new TextDecoder().decode(rec.data) : "";
        abort.current?.abort();
        setState(text.includes("/t/") ? "done" : "error");
        setMsg(text ? (text.includes("/t/") ? `✓ Works. This tag opens: ${text}` : `This tag has something else on it: ${text}`) : "The tag is empty. Write to it first.");
      };
    } catch (e) { fail(e); }
  };
  const busy = state === "writing" || state === "reading";

  return (
    <div>
      <div className={"nfc-orb" + (busy ? " live" : "")}><span>📲</span></div>
      <h2 style={{ textAlign: "center" }}>Tap to share</h2>
      <p className="muted" style={{ textAlign: "center", marginTop: 0 }}>Put your link on an NFC card or sticker. People tap it with their phone and your page opens. No app needed.</p>

      <div style={{ margin: "10px 0" }}>
        {links.map((l) => <button key={l.mode} type="button" onClick={() => setMode(l.mode)} className={"pill" + (l.mode === cur.mode ? " on" : "")} style={{ border: 0, width: "auto", fontWeight: 400, cursor: "pointer" }}>{l.label}</button>)}
      </div>

      <label className="f">Your tap link</label>
      <input readOnly value={cur.url} onFocus={(e) => e.currentTarget.select()} />

      {supported === false ? (
        <div className="card muted" style={{ background: "#f6f7f9" }}>
          This browser can't write NFC tags. That needs Chrome on Android over HTTPS. On iPhone, use a free NFC tag app and write the link above as a URL record. Opening the link works everywhere.
        </div>
      ) : (
        <div className="row">
          <button type="button" onClick={write} disabled={busy || supported === null}>{state === "writing" ? "Waiting for tag…" : "Write to tag"}</button>
          <button type="button" className="ghost" onClick={verify} disabled={busy || supported === null}>{state === "reading" ? "Waiting…" : "Check a tag"}</button>
        </div>
      )}
      {msg && <p className={state === "error" ? "err" : "ok"} style={{ marginTop: 10 }}>{msg}</p>}
      <p className="muted">Taps are counted separately from QR scans. Buy plain NTAG215 cards or stickers; they cost about ₹30 each.</p>
    </div>
  );
}
