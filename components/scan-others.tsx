"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import type { Found } from "@/app/app/tap-actions";

/** Scan someone else's QR code with the camera. A FounderTouch card shows who it is and can be saved. */
export default function ScanOthers({ peek, save }: { peek: (raw: string) => Promise<Found>; save: (handle: string, mode: string) => Promise<{ ok: boolean; own?: boolean }> }) {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const raf = useRef(0);
  const busy = useRef(false);
  const [on, setOn] = useState(false);
  const [err, setErr] = useState("");
  const [found, setFound] = useState<Extract<Found, { ok: true }> | null>(null);
  const [other, setOther] = useState("");
  const [saved, setSaved] = useState(false);
  const [paste, setPaste] = useState("");

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setOn(false);
  }, []);
  useEffect(() => stop, [stop]);

  const handle = useCallback(async (raw: string) => {
    if (busy.current) return;
    busy.current = true;
    setSaved(false);
    const r = await peek(raw);
    if (r.ok) { setFound(r); setOther(""); stop(); try { navigator.vibrate?.([40, 60, 40]); } catch { /* ignore */ } }
    else { setFound(null); setOther(raw); }
    setTimeout(() => { busy.current = false; }, 1200);
  }, [peek, stop]);

  const tick = useCallback(() => {
    const v = video.current, c = canvas.current;
    if (v && c && v.readyState === v.HAVE_ENOUGH_DATA && !busy.current) {
      const w = Math.min(640, v.videoWidth), h = Math.round((v.videoHeight / v.videoWidth) * w);
      c.width = w; c.height = h;
      const ctx = c.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(v, 0, 0, w, h);
      const hit = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" });
      if (hit?.data) void handle(hit.data);
    }
    raf.current = requestAnimationFrame(tick);
  }, [handle]);

  const start = async () => {
    setErr(""); setFound(null); setOther(""); setSaved(false);
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      if (video.current) { video.current.srcObject = stream.current; await video.current.play(); }
      setOn(true);
      raf.current = requestAnimationFrame(tick);
    } catch (e) {
      setErr(e instanceof Error && e.name === "NotAllowedError" ? "Camera permission was denied. Allow it in your browser settings, or paste the link below." : "Couldn't open the camera. It needs HTTPS (or localhost) and a camera. You can paste a link below.");
    }
  };
  const doSave = async () => { if (!found) return; const r = await save(found.handle, found.mode); if (r.ok) setSaved(true); else setErr(r.own ? "That's your own card." : "Couldn't save that card."); };
  const isUrl = /^https?:\/\//i.test(other);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Scan a QR code</h2>
      <p className="muted" style={{ marginTop: 0 }}>Point your camera at someone&apos;s FounderTouch QR code to see their card and save it.</p>

      <div className="viewfinder">
        <video ref={video} playsInline muted style={{ display: on ? "block" : "none" }} />
        {on && <div className="vf-frame" />}
        {!on && <div className="vf-empty">📷</div>}
      </div>
      <canvas ref={canvas} style={{ display: "none" }} />
      <div style={{ marginTop: 10 }}>{on ? <button type="button" className="ghost" onClick={stop}>Stop camera</button> : <button type="button" onClick={start}>📷 Start scanning</button>}</div>
      {err && <div className="err" style={{ marginTop: 10 }}>{err}</div>}

      {found && (
        <div className="card found-card" style={{ marginTop: 12 }}>
          <div className="found-ini">{found.initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="muted" style={{ fontSize: 12 }}>{found.own ? "That's you" : "🎉 Found a card"}</div>
            <b style={{ fontSize: 18 }}>{found.name}</b>
            <div className="muted">{found.sub || found.modeLabel}</div>
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {!found.own && <button type="button" onClick={doSave} disabled={saved} style={{ width: "auto", padding: "8px 14px" }}>{saved ? "✓ Saved" : "Save card"}</button>}
            <a className="btn ghost" style={{ width: "auto", padding: "8px 14px" }} href={`/${found.handle}?mode=${found.mode}`} target="_blank">Open</a>
          </div>
        </div>
      )}
      {other && !found && (
        <div className="card" style={{ marginTop: 12 }}>
          <b>That isn&apos;t a FounderTouch card</b>
          <div className="muted" style={{ wordBreak: "break-all", margin: "4px 0 8px" }}>{other}</div>
          {isUrl && <a className="btn ghost" href={other} target="_blank" rel="noopener noreferrer">Open link ↗</a>}
        </div>
      )}

      <div className="card" style={{ marginTop: 12 }}>
        <b>No camera?</b>
        <form onSubmit={(e) => { e.preventDefault(); if (paste.trim()) { void handle(paste.trim()); setPaste(""); } }}>
          <input value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="Paste a card link" autoCapitalize="none" autoCorrect="off" />
          <button className="ghost">Look it up</button>
        </form>
      </div>
    </div>
  );
}
