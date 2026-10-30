"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import type { CheckInResult } from "@/app/app/events/actions";

/** Camera scanner for event check-in. Reads ticket QR codes and marks the attendee as arrived. */
export default function QrScanner({ eventId, initialChecked, total, check }: { eventId: string; initialChecked: number; total: number; check: (eventId: string, code: string) => Promise<CheckInResult> }) {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const busy = useRef(false);
  const lastCode = useRef({ code: "", at: 0 });
  const raf = useRef(0);
  const [on, setOn] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState<CheckInResult | null>(null);
  const [checked, setChecked] = useState(initialChecked);
  const [manual, setManual] = useState("");

  const handle = useCallback(async (code: string) => {
    if (busy.current) return;
    busy.current = true;
    try {
      const r = await check(eventId, code);
      setRes(r);
      if (r.status === "ok") setChecked((c) => c + 1);
      navigator.vibrate?.(r.status === "ok" ? 80 : [60, 60, 60]);
    } catch { setRes({ status: "error" }); }
    setTimeout(() => { busy.current = false; }, 1400);
  }, [check, eventId]);

  const tick = useCallback(() => {
    const v = video.current, c = canvas.current;
    if (v && c && v.readyState === v.HAVE_ENOUGH_DATA && !busy.current) {
      const w = Math.min(640, v.videoWidth), h = Math.round((v.videoHeight / v.videoWidth) * w);
      c.width = w; c.height = h;
      const ctx = c.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(v, 0, 0, w, h);
      const img = ctx.getImageData(0, 0, w, h);
      const hit = jsQR(img.data, w, h, { inversionAttempts: "dontInvert" });
      const now = Date.now();
      if (hit?.data && (hit.data !== lastCode.current.code || now - lastCode.current.at > 4000)) {
        lastCode.current = { code: hit.data, at: now };
        void handle(hit.data);
      }
    }
    raf.current = requestAnimationFrame(tick);
  }, [handle]);

  const start = async () => {
    setErr(""); setRes(null);
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      if (video.current) { video.current.srcObject = stream.current; await video.current.play(); }
      setOn(true);
      raf.current = requestAnimationFrame(tick);
    } catch (e) {
      setErr(e instanceof Error && e.name === "NotAllowedError" ? "Camera permission was denied. Allow it in your browser settings, or type the ticket code below."
        : "Couldn't open the camera. It needs HTTPS (or localhost) and a camera. You can still type the ticket code below.");
    }
  };
  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setOn(false);
  }, []);
  useEffect(() => stop, [stop]);

  const banner = res && {
    ok: { bg: "#e6f9ef", fg: "#0b7a4b", text: `✅ ${res.name} checked in` },
    already: { bg: "#fff4e0", fg: "#a35a00", text: `⚠️ ${res.name} was already checked in${res.at ? " at " + new Date(res.at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}` },
    unknown: { bg: "#fde8e8", fg: "#a61b1b", text: "❌ Not a ticket for this event" },
    error: { bg: "#fde8e8", fg: "#a61b1b", text: "Something went wrong. Try again." },
  }[res.status];

  return (
    <div>
      <div className="stat"><div className="card"><b>{checked}</b><span className="muted">checked in</span></div><div className="card"><b>{total}</b><span className="muted">registered</span></div></div>

      <div style={{ position: "relative", borderRadius: 18, overflow: "hidden", background: "#0b0d12", aspectRatio: "1 / 1" }}>
        <video ref={video} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", display: on ? "block" : "none" }} />
        {on && <div style={{ position: "absolute", inset: "18%", border: "3px solid rgba(255,255,255,.9)", borderRadius: 18, boxShadow: "0 0 0 999px rgba(0,0,0,.35)" }} />}
        {!on && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#cfd4dd", fontSize: 44 }}>📷</div>}
      </div>
      <canvas ref={canvas} style={{ display: "none" }} />

      <div style={{ marginTop: 10 }}>{on ? <button type="button" className="ghost" onClick={stop}>Stop camera</button> : <button type="button" onClick={start}>Start scanning</button>}</div>
      {err && <div className="err" style={{ marginTop: 10 }}>{err}</div>}
      {banner && <div style={{ marginTop: 10, padding: "12px 14px", borderRadius: 14, background: banner.bg, color: banner.fg, fontWeight: 600 }}>{banner.text}{res?.company ? <span style={{ fontWeight: 400 }}> · {res.company}</span> : null}</div>}

      <div className="card" style={{ marginTop: 14 }}>
        <b>No camera?</b>
        <form onSubmit={(e) => { e.preventDefault(); if (manual.trim()) { void handle(manual.trim()); setManual(""); } }}>
          <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Paste the ticket link or code" autoCapitalize="none" autoCorrect="off" />
          <button className="ghost">Check in</button>
        </form>
      </div>
    </div>
  );
}
