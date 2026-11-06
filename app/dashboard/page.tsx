import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { MODES, MODE_INFO } from "@/lib/modes";
import { gradient } from "@/lib/look";
import Icon from "@/components/icon";

const SOURCE_LABEL: Record<string, string> = { qr: "QR code", link: "Link", nfc: "NFC tag", tap: "Tap to share", scan: "In-app scan", event: "Event", manual: "Added by hand", email: "Email signature" };

/** Period-over-period change, HiHello-style. */
function Delta({ cur, prev }: { cur: number; prev: number }) {
  if (prev === 0 && cur === 0) return <span className="delta flat">–</span>;
  if (prev === 0) return <span className="delta up">new</span>;
  const pct = Math.round(((cur - prev) / prev) * 100);
  if (pct === 0) return <span className="delta flat">0%</span>;
  return <span className={"delta " + (pct > 0 ? "up" : "down")}>{pct > 0 ? "+" : ""}{pct}%</span>;
}

export default async function Overview({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { profile } = await requireOwner();
  const pid = profile.id;
  const sp = await searchParams;
  const span = [7, 30].includes(Number(sp.days)) ? Number(sp.days) : 14;

  const now = new Date(), endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
  const since = new Date(now.getTime() - (span - 1) * 864e5); since.setHours(0, 0, 0, 0);
  const prevSince = new Date(since.getTime() - span * 864e5);

  const [scans, prevViews, total, newContacts, prevContacts, saves, prevSaves, pending, due, nfcTaps, recent, upcoming] = await Promise.all([
    db.scanEvent.findMany({ where: { shareLink: { profileId: pid }, createdAt: { gte: since } }, select: { createdAt: true, mode: true, source: true } }),
    db.scanEvent.count({ where: { shareLink: { profileId: pid }, createdAt: { gte: prevSince, lt: since } } }),
    db.contact.count({ where: { profileId: pid, status: "CONNECTED" } }),
    db.contact.count({ where: { profileId: pid, status: { not: "BLOCKED" }, createdAt: { gte: since } } }),
    db.contact.count({ where: { profileId: pid, status: { not: "BLOCKED" }, createdAt: { gte: prevSince, lt: since } } }),
    db.savedCard.count({ where: { profileId: pid, createdAt: { gte: since } } }),
    db.savedCard.count({ where: { profileId: pid, createdAt: { gte: prevSince, lt: since } } }),
    db.contact.count({ where: { profileId: pid, status: "PENDING" } }),
    db.contact.count({ where: { profileId: pid, status: "CONNECTED", followUpAt: { lte: endOfToday } } }),
    db.nfcTag.aggregate({ where: { profileId: pid }, _sum: { taps: true } }),
    db.contactActivity.findMany({ where: { contact: { profileId: pid } }, orderBy: { createdAt: "desc" }, take: 8, include: { contact: { select: { id: true, name: true } } } }),
    db.event.findMany({ where: { profileId: pid, OR: [{ startsAt: null }, { startsAt: { gte: now } }] }, orderBy: { startsAt: "asc" }, take: 4, include: { _count: { select: { attendees: true } } } }),
  ]);

  // Daily series for the area chart.
  const days = Array.from({ length: span }, (_, i) => { const d = new Date(since.getTime() + i * 864e5); return { key: d.toDateString(), date: d, n: 0 }; });
  for (const s of scans) { const d = days.find((x) => x.key === s.createdAt.toDateString()); if (d) d.n++; }
  const maxDay = Math.max(1, ...days.map((d) => d.n));
  const W = 640, H = 170, P = { t: 14, r: 12, b: 24, l: 30 };
  const x = (i: number) => P.l + (i * (W - P.l - P.r)) / Math.max(1, span - 1);
  const y = (n: number) => H - P.b - (n / maxDay) * (H - P.t - P.b);
  const line = days.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(d.n).toFixed(1)}`).join(" ");
  const area = `${line} L${x(span - 1).toFixed(1)} ${H - P.b} L${x(0).toFixed(1)} ${H - P.b} Z`;
  const short = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  // Views per card and per channel.
  const perMode: Record<string, number> = {}; const perSource: Record<string, number> = {};
  for (const s of scans) { perMode[s.mode] = (perMode[s.mode] ?? 0) + 1; perSource[s.source || "link"] = (perSource[s.source || "link"] ?? 0) + 1; }
  const cards = ["ALL", ...MODES].map((m) => ({ m, n: perMode[m] ?? 0 })).sort((a, b) => b.n - a.n);
  const cardMax = Math.max(1, ...cards.map((c) => c.n));
  const sources = Object.entries(perSource).sort((a, b) => b[1] - a[1]);
  const srcMax = Math.max(1, ...sources.map(([, n]) => n));
  const bg = gradient(profile.theme);
  const ago = (d: Date) => { const m = Math.round((now.getTime() - d.getTime()) / 60000); return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`; };

  return (
    <>
      <div className="dash-top">
        <div>
          <h2>Analytics</h2>
          <div className="dash-sub">How your cards performed, {short(since)} – {short(now)}.</div>
        </div>
        <div className="range" role="tablist" aria-label="Date range">
          {[7, 14, 30].map((d) => <Link key={d} role="tab" aria-selected={span === d} href={d === 14 ? "/dashboard" : `/dashboard?days=${d}`} className={span === d ? "on" : ""}>{d} days</Link>)}
        </div>
      </div>

      <div className="kpis">
        <div className="kpi"><span className="k-lbl">Card views</span><b>{scans.length}</b><Delta cur={scans.length} prev={prevViews} /></div>
        <Link href="/dashboard/all" className="kpi"><span className="k-lbl">New contacts</span><b>{newContacts}</b><Delta cur={newContacts} prev={prevContacts} /></Link>
        <div className="kpi"><span className="k-lbl">Card saves</span><b>{saves}</b><Delta cur={saves} prev={prevSaves} /></div>
        <Link href="/dashboard/all" className="kpi"><span className="k-lbl">Connections</span><b>{total}</b><span className="delta flat">all time</span></Link>
        <Link href="/app/nfc" className="kpi"><span className="k-lbl">NFC taps</span><b>{nfcTaps._sum.taps ?? 0}</b><span className="delta flat">all time</span></Link>
      </div>

      {(pending > 0 || due > 0) && (
        <div className="attn">
          {pending > 0 && <Link href="/dashboard/all?stage=pending">{pending} waiting for your approval</Link>}
          {due > 0 && <Link href="/dashboard/all?stage=due">{due} follow-up{due === 1 ? "" : "s"} due</Link>}
        </div>
      )}

      <div className="panels">
        <div className="panel chartp">
          <h3>Card views over time</h3>
          <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Card views per day, last ${span} days`}>
            <defs>
              <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {[0, 0.5, 1].map((t) => <line key={t} x1={P.l} x2={W - P.r} y1={y(maxDay * t)} y2={y(maxDay * t)} className="grid" />)}
            <text x={P.l - 6} y={y(maxDay) + 4} className="ax" textAnchor="end">{maxDay}</text>
            <text x={P.l - 6} y={y(0) + 4} className="ax" textAnchor="end">0</text>
            <path d={area} fill="url(#fade)" />
            <path d={line} className="series" />
            {days.map((d, i) => <circle key={d.key} cx={x(i)} cy={y(d.n)} r={span === 30 ? 2.4 : 3.2} className="dot"><title>{`${short(d.date)}: ${d.n} view${d.n === 1 ? "" : "s"}`}</title></circle>)}
            <text x={x(0)} y={H - 6} className="ax">{short(days[0].date)}</text>
            <text x={x(span - 1)} y={H - 6} className="ax" textAnchor="end">{short(days[span - 1].date)}</text>
          </svg>
        </div>

        <div className="panel">
          <h3>Views by card</h3>
          {cards.map(({ m, n }) => (
            <Link key={m} href={`/dashboard/${m.toLowerCase()}`} className="bar-row">
              <span className="mode-chip" style={{ background: bg }} aria-hidden><Icon mode={m} size={15} /></span>
              <span className="lbl">{(MODE_INFO as Record<string, { label: string }>)[m]?.label ?? m}</span>
              <span className="bar"><i style={{ width: `${(n / cardMax) * 100}%` }} /></span>
              <span className="v">{n}</span>
            </Link>
          ))}
        </div>

        <div className="panel">
          <h3>How people opened it</h3>
          {sources.length === 0 && <div className="muted2">No views in this period yet. Share your QR code to get started.</div>}
          {sources.map(([s, n]) => (
            <div key={s} className="bar-row">
              <span className="lbl">{SOURCE_LABEL[s] ?? s.charAt(0).toUpperCase() + s.slice(1)}</span>
              <span className="bar"><i style={{ width: `${(n / srcMax) * 100}%` }} /></span>
              <span className="v">{n}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="panels">
        <div className="panel">
          <h3>Recent activity</h3>
          {recent.length === 0 && <div className="muted2">Nothing yet.</div>}
          {recent.map((a) => (
            <div key={a.id} className="feed-row"><Link href={`/app/contacts/${a.contact.id}`}><b>{a.contact.name}</b></Link> <span className="muted2">· {a.kind}{a.text ? `: ${a.text}` : ""} · {ago(a.createdAt)}</span></div>
          ))}
        </div>
        <div className="panel">
          <h3>Upcoming events</h3>
          {upcoming.length === 0 && <div className="muted2">No events planned.</div>}
          {upcoming.map((e) => (
            <div key={e.id} className="feed-row"><Link href={`/app/events/${e.id}`}><b>{e.name}</b></Link> <span className="muted2">· {e.startsAt ? e.startsAt.toLocaleDateString("en-IN", { dateStyle: "medium" }) : "No date"} · {e._count.attendees} registered</span></div>
          ))}
        </div>
      </div>
    </>
  );
}
