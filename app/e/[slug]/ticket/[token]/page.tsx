import QRCode from "qrcode";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { themeOf } from "@/lib/look";
export const dynamic = "force-dynamic";

/** The attendee's ticket. The QR holds this page's address; the organizer's scanner reads the token from it. */
export default async function Ticket({ params }: { params: Promise<{ slug: string; token: string }> }) {
  const { slug, token } = await params;
  const a = await db.attendee.findUnique({ where: { token }, include: { event: { include: { profile: true } } } });
  if (!a || a.event.slug !== slug) notFound();
  const ev = a.event, t = themeOf(ev.profile.theme);
  const c1 = ev.color1 || t.from, c2 = ev.color2 || t.to;
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const qr = await QRCode.toDataURL(`${origin}/e/${ev.slug}/ticket/${a.token}`, { margin: 1, width: 520, color: { dark: "#111827", light: "#ffffff" } });
  const bg = ev.cover ? `linear-gradient(rgba(0,0,0,.3), rgba(0,0,0,.6)), url(/event-img/${ev.slug}/cover) center/cover` : `linear-gradient(135deg, ${c1}, ${c2})`;
  return (
    <div className="screen" style={{ ["--accent" as string]: c1 }}>
      <div className="card hero hero-themed" style={{ background: bg, border: 0 }}>
        {ev.logo && <img src={`/event-img/${ev.slug}/logo`} alt="" style={{ height: 60, maxWidth: 140, objectFit: "contain", background: "#fff", borderRadius: 14, padding: 5, margin: "0 auto 8px", display: "block" }} />}
        <span className="pill">🎟 Your ticket</span>
        <h1 style={{ marginTop: 8 }}>{ev.name}</h1>
        {ev.startsAt && <div>🗓 {ev.startsAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</div>}
        {ev.location && <div>📍 {ev.location}</div>}
      </div>
      <div className="card" style={{ textAlign: "center" }}>
        <b style={{ fontSize: 18 }}>{a.name}</b>
        {a.company && <div className="muted">{a.company}</div>}
        <img className="qr" src={qr} alt="Ticket QR code" style={{ width: 230, height: 230 }} />
        {a.checkedInAt
          ? <div className="ok" style={{ margin: 0 }}>✅ Checked in at {a.checkedInAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
          : <div className="muted">Show this QR at the entrance. Take a screenshot so you have it offline.</div>}
      </div>
      <Link href={`/e/${ev.slug}`} className="btn ghost">← Event page</Link>
    </div>
  );
}
