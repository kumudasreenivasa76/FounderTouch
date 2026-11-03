"use client";
import { useEffect, useState } from "react";

export type OfflineCardData = { name: string; sub: string; email: string; phone: string; website: string; company: string; url: string; qr: string };

/** Saves the owner's card on this device whenever they open Home online, so it can be shown without a connection. */
export function SaveOfflineCard({ data }: { data: OfflineCardData }) {
  useEffect(() => { try { localStorage.setItem("ft_card", JSON.stringify(data)); } catch { /* storage full or blocked */ } }, [data]);
  return null;
}

const vesc = (s: string) => s.replace(/\\/g, "\\\\").replace(/[;,]/g, (c) => "\\" + c).replace(/\r?\n/g, "\\n");

/** Offline page: shows the saved card and QR, and can download a contact file, all without the server. */
export default function OfflineCard() {
  const [card, setCard] = useState<OfflineCardData | null | undefined>(undefined);
  useEffect(() => { try { setCard(JSON.parse(localStorage.getItem("ft_card") ?? "null")); } catch { setCard(null); } }, []);

  if (card === undefined) return null;
  if (!card) return <div className="card muted">No card is saved on this device yet. Open FounderTouch once while online and your card will be available here.</div>;
  const vcf = () => {
    const l = ["BEGIN:VCARD", "VERSION:3.0", `FN:${vesc(card.name)}`, card.company && `ORG:${vesc(card.company)}`, card.sub && `TITLE:${vesc(card.sub)}`, card.email && `EMAIL:${card.email}`, card.phone && `TEL;TYPE=CELL:${card.phone}`, card.website && `URL:${card.website}`, "END:VCARD"].filter(Boolean).join("\r\n") + "\r\n";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([l], { type: "text/vcard" })); a.download = `${card.name.replace(/\s+/g, "-").toLowerCase()}.vcf`; a.click();
  };
  return (
    <div className="card" style={{ textAlign: "center" }}>
      <b style={{ fontSize: 20 }}>{card.name}</b>
      {card.sub && <div className="muted">{card.sub}</div>}
      <img src={card.qr} alt="QR code for my card" style={{ width: 260, height: 260, margin: "14px auto", display: "block" }} />
      <div className="muted" style={{ marginBottom: 10 }}>Scanning this opens my card once their phone is online.</div>
      <button type="button" onClick={vcf}>Save my contact file</button>
    </div>
  );
}
