"use client";
import { useState } from "react";
import I from "@/components/icon";
import { SocialIcon } from "@/components/social-icon";

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
    { k: "link", icon: "link", label: "Link", onClick: copy },
    { k: "text", icon: "message", label: "Text", href: `sms:?&body=${encodeURIComponent(text)}` },
    { k: "email", icon: "mail", label: "Email", href: `mailto:?subject=${encodeURIComponent(`${name}'s digital card`)}&body=${encodeURIComponent(text)}` },
    { k: "wa", icon: "whatsapp", label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(text)}`, external: true },
    { k: "more", icon: "more", label: "More", onClick: more },
  ];
  return (
    <div>
      <div className="qr-frame" style={{ background: frame }}>
        <div className="qr-tile">
          <img src={qrSrc} alt={`QR code that opens ${name}'s ${modeLabel} page`} />
          <div className="qr-center">{center}</div>
        </div>
        <div className="qr-name">{name}</div>
        <div className="qr-sub">{modeLabel} page</div>
      </div>

      <div className="share-via" role="group" aria-label="Send my card">
        {via.map((v) => v.href
          ? <a key={v.k} className="via" href={v.href} {...(v.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}><span>{v.icon === "whatsapp" ? <SocialIcon k="whatsapp" size={19} /> : <I n={v.icon} size={20} />}</span>{v.label}</a>
          : <button key={v.k} type="button" className="via" onClick={v.onClick}><span>{v.icon === "whatsapp" ? <SocialIcon k="whatsapp" size={19} /> : <I n={v.icon} size={20} />}</span>{v.label}</button>)}
      </div>
      <div className="muted" style={{ textAlign: "center", minHeight: 18, marginTop: -4 }}>{note || "Anyone who scans this QR code opens this page."}</div>
      <a className="btn ghost" style={{ marginTop: 10 }} href={qrSrc} download={downloadName}><I n="download" /> Save QR image</a>
    </div>
  );
}
