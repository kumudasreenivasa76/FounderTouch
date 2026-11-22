"use client";
import Link from "next/link";
import { useState } from "react";
import Icon from "@/components/icon";

/** Tap (NFC), Share Link, Download, and the phone's share sheet. */
export default function ShareActions({ url, qr, file, title }: { url: string; qr: string; file: string; title: string }) {
  const [msg, setMsg] = useState("");
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setMsg("Link copied"); } catch { setMsg(url); }
    setTimeout(() => setMsg(""), 2200);
  };
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title, url }); } catch { /* closed */ } }
    else copy();
  };
  return (
    <>
      <div className="d-acts" style={{ margin: "18px 0 6px" }}>
        <Link className="d-act" href="/app/card?via=tap"><i><Icon name="nfc" size={24} /></i>Tap (NFC)</Link>
        <button type="button" className="d-act" onClick={copy}><i><Icon name="link" size={24} /></i>Share Link</button>
        <a className="d-act" href={qr} download={file}><i><Icon name="download" size={24} /></i>Download</a>
      </div>
      <p className="d-t2" role="status" style={{ textAlign: "center", minHeight: 18 }}>{msg}</p>
      <button type="button" className="d-next" onClick={share}>Share via<span className="d-bico" aria-hidden><Icon name="share" size={18} /></span></button>
    </>
  );
}
