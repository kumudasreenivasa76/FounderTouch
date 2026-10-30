"use client";
import { useState } from "react";

/** A big branded QR with the ways to send it, in the style of HiHello: Link, Text, Email, WhatsApp and More. */
export default function QrPanel({ qrSrc, url, name, modeLabel, modeIcon, frame, center, downloadName }: {
  qrSrc: string; url: string; name: string; modeLabel: string; modeIcon: string; frame: string; center: React.ReactNode; downloadName: string;
}) {
  const [note, setNote] = useState("");
  const text = `Here is my digital card: ${url}`;
  const flash = (m: string) => { setNote(m); setTimeout(() => setNote(""), 1800); };
  const copy = async () => { try { await navigator.clipboard.writeText(url); flash("Link copied"); } catch { flash(url); } };
  const more = async () => {
    if (navigator.share) { try { await navigator.share({ title: `${name}'s digital card`, text: "My digital card", url }); } catch { /* cancelled */ } }
    else copy();
  };
  const via = [
    { k: "link", icon: "🔗", label: "Link", onClick: copy },
    { k: "text", icon: "💬", label: "Text", href: `sms:?&body=${encodeURIComponent(text)}` },
    { k: "email", icon: "✉️", label: "Email", href: `mailto:?subject=${encodeURIComponent(`${name}'s digital card`)}&body=${encodeURIComponent(text)}` },
    { k: "wa", icon: "🟢", label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(text)}`, external: true },
    { k: "more", icon: "⋯", label: "More", onClick: more },
  ];
  return (
    <div>
      <div className="qr-frame" style={{ background: frame }}>
        <div className="qr-tile">
          <img src={qrSrc} alt={`QR code that opens ${name}'s ${modeLabel} page`} />
          <div className="qr-center">{center}</div>
        </div>
        <div className="qr-name">{name}</div>
        <div className="qr-sub">{modeIcon} {modeLabel} page</div>
      </div>

      <div className="share-via" role="group" aria-label="Send my card">
        {via.map((v) => v.href
          ? <a key={v.k} className="via" href={v.href} {...(v.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}><span>{v.icon}</span>{v.label}</a>
          : <button key={v.k} type="button" className="via" onClick={v.onClick}><span>{v.icon}</span>{v.label}</button>)}
      </div>
      <div className="muted" style={{ textAlign: "center", minHeight: 18, marginTop: -4 }}>{note || "Anyone who scans this QR code opens this page."}</div>
      <a className="btn ghost" style={{ marginTop: 10 }} href={qrSrc} download={downloadName}>⬇ Save QR image</a>
    </div>
  );
}
