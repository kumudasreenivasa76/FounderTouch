"use client";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/icon";

type Props = { name: string; handle: string; url: string; qr: string; vcf: string; imageUrl: string; openSignal?: number; hideButton?: boolean };
type Row = { icon: string; label: string; hint?: string; online?: boolean; run?: () => void; href?: string };

/**
 * One calm button on the card screen. It opens a sheet with the ways to share.
 * Offline, the sheet says so and dims only the options that need internet; nothing else is labelled.
 */
export default function ShareSheet({ name, handle, url, qr, vcf, imageUrl, openSignal = 0, hideButton }: Props) {
  const [open, setOpen] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [online, setOnline] = useState(true);
  const [msg, setMsg] = useState("");
  const opener = useRef<HTMLButtonElement>(null);
  const first = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setOnline(navigator.onLine);
    const up = () => setOnline(true), down = () => setOnline(false);
    window.addEventListener("online", up); window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);
  useEffect(() => { if (openSignal > 0) setOpen(true); }, [openSignal]);
  useEffect(() => {
    if (!open && !showQr) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); setShowQr(false); opener.current?.focus(); } };
    document.addEventListener("keydown", key);
    if (open) setTimeout(() => first.current?.focus(), 30);
    return () => document.removeEventListener("keydown", key);
  }, [open, showQr]);

  const say = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 3500); };
  const text = `Hi, here is my digital card: ${url}`;
  const download = (blob: Blob, filename: string) => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); };

  const nearby = async () => {
    try {
      const vcard = new File([vcf], `${handle}.vcf`, { type: "text/vcard" });
      let files: File[] = [vcard];
      try { const r = await fetch(imageUrl); if (r.ok) files = [new File([await r.blob()], `${handle}-card.png`, { type: "image/png" }), vcard]; } catch { /* offline: contact file only */ }
      if (navigator.canShare?.({ files })) await navigator.share({ title: `${name}'s card`, files });
      else if (navigator.share) await navigator.share({ title: `${name}'s card`, text, url });
      else say("This browser has no share sheet. Use the QR code or contact file.");
    } catch { /* cancelled */ }
  };
  const writeTag = async () => {
    const W = (window as unknown as { NDEFReader?: new () => { write: (m: unknown) => Promise<void> } }).NDEFReader;
    if (!W) { say("Writing to a tag needs Chrome on Android with NFC on."); return; }
    say("Hold your phone against the tag…");
    try {
      await new W().write({ records: [{ recordType: "mime", mediaType: "text/vcard", data: new TextEncoder().encode(vcf) }] });
      say("Done. Anyone who taps it can save your contact.");
    } catch { say("Couldn't write to the tag. Hold it closer and try again."); }
  };
  const copy = async () => { try { await navigator.clipboard.writeText(url); say("Link copied."); } catch { prompt("Copy this link", url); } };

  const rows: Row[] = [
    { icon: "▦", label: "QR code", run: () => { setOpen(false); setShowQr(true); } },
    { icon: "chat", label: "Text message", online: true, href: `sms:?&body=${encodeURIComponent(text)}` },
    { icon: "mail", label: "Email", online: true, href: `mailto:?subject=${encodeURIComponent(`${name}'s digital card`)}&body=${encodeURIComponent(text)}` },
    { icon: "copy", label: "Copy link", run: copy },
    { icon: "share", label: "Nearby share", hint: "AirDrop or Nearby Share", run: nearby },
    { icon: "wallet", label: "Add to wallet", online: true, href: "/app/card?pane=wallet" },
    { icon: "download", label: "Save contact file", run: () => download(new Blob([vcf], { type: "text/vcard" }), `${handle}.vcf`) },
    { icon: "nfc", label: "Write to NFC tag", run: writeTag },
  ];

  return (
    <div style={{ margin: hideButton ? 0 : "14px 0" }}>
      {!hideButton && <button ref={opener} type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" style={{ fontSize: 17, minHeight: 52, borderRadius: 16 }}>Share card</button>}
      {msg && <div role="status" className="ok" style={{ marginTop: 8 }}>{msg}</div>}

      {open && (
        <div onClick={() => { setOpen(false); opener.current?.focus(); }} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(17,24,39,.5)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div role="dialog" aria-modal="true" aria-label="Share my card" onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", width: "min(100%, 420px)", maxHeight: "80vh", overflowY: "auto", borderRadius: "22px 22px 0 0", padding: "8px 12px 18px" }}>
            <div aria-hidden style={{ width: 40, height: 4, borderRadius: 4, background: "#cfd4dd", margin: "4px auto 10px" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 6px 6px" }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Share card</h2>
              <button type="button" className="ghost sm" onClick={() => { setOpen(false); opener.current?.focus(); }}>Close</button>
            </div>
            <div style={{ textAlign: "center", padding: "4px 0 10px" }}>
              <img src={qr} alt="QR code for my card" style={{ width: 200, height: 200 }} />
              <div className="muted">Scan to open my card{!online ? " (works offline)" : ""}</div>
            </div>
            {!online && <p className="muted" style={{ margin: "0 6px 6px" }}>You are offline. QR code, nearby share, contact file and NFC still work.</p>}
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {rows.map((r, n) => {
                const off = !online && r.online;
                const inner = (<><span aria-hidden style={{ width: 36, textAlign: "center", fontSize: 20 }}><Icon name={r.icon} size={22} /></span><span style={{ flex: 1, textAlign: "left" }}><b style={{ fontWeight: 600 }}>{r.label}</b>{r.hint && <span className="muted" style={{ display: "block" }}>{r.hint}</span>}{off && <span className="muted" style={{ display: "block" }}>Needs internet</span>}</span></>);
                const style: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, width: "100%", minHeight: 52, padding: "6px 8px", background: "none", color: "#1c2330", border: 0, borderTop: n ? "1px solid #eceff4" : 0, borderRadius: 0, font: "inherit", opacity: off ? 0.5 : 1 };
                const setFirst = n === 0 ? (el: HTMLElement | null) => { first.current = el; } : undefined;
                return (
                  <li key={r.label}>
                    {r.href && !off
                      ? <a href={r.href} style={style} ref={setFirst}>{inner}</a>
                      : <button type="button" disabled={off} style={style} ref={setFirst} onClick={() => { r.run?.(); }}>{inner}</button>}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {showQr && (
        <div onClick={() => { setShowQr(false); opener.current?.focus(); }} role="dialog" aria-modal="true" aria-label="My QR code"
          style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(17,24,39,.94)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, color: "#fff", padding: 24 }}>
          <b style={{ fontSize: 22 }}>{name}</b>
          <img src={qr} alt="QR code for my card" style={{ width: "min(80vw, 60vh)", background: "#fff", borderRadius: 20, padding: 14 }} />
          <button type="button" className="ghost" onClick={() => { setShowQr(false); opener.current?.focus(); }} style={{ width: "auto", padding: "10px 28px" }}>Done</button>
        </div>
      )}
    </div>
  );
}
