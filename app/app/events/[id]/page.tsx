import QRCode from "qrcode";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { themeOf } from "@/lib/look";
import PageHead from "@/components/page-head";
import ShareButtons from "@/components/share-buttons";
import { deleteEvent, removeAttendee, removeProject, saveBranding, setCheckedIn, toggleEvent, updateEvent } from "../actions";
export const dynamic = "force-dynamic";

const ERR: Record<string, string> = { name: "Give the event a name.", img: "Images must be JPG, PNG or WebP under 5 MB." };
const local = (d: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
const time = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

export default async function ManageEvent({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ err?: string; saved?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { profile } = await requireOwner();
  const e = await db.event.findFirst({
    where: { id, profileId: profile.id },
    include: { attendees: { orderBy: [{ checkedInAt: "desc" }, { createdAt: "desc" }] }, projects: { orderBy: { createdAt: "desc" } }, jobs: { include: { _count: { select: { applications: true } } }, orderBy: { createdAt: "desc" } } },
  });
  if (!e) notFound();
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const qr = await QRCode.toDataURL(`${origin}/e/${e.slug}`, { margin: 1, width: 420 });
  const t = themeOf(profile.theme);
  const c1 = e.color1 || t.from, c2 = e.color2 || t.to;
  const checked = e.attendees.filter((a) => a.checkedInAt).length;

  return (
    <>
      <PageHead title={e.name} back="/app/events" saved={!!sp.saved} error={sp.err ? ERR[sp.err] : undefined} />

      <div className="stat">
        <div className="card"><b>{e.attendees.length}</b><span className="muted">registered</span></div>
        <div className="card"><b>{checked}</b><span className="muted">checked in</span></div>
        <div className="card"><b>{e.projects.length}</b><span className="muted">projects</span></div>
      </div>
      <Link href={`/app/events/${e.id}/scan`} className="btn" style={{ marginBottom: 12 }}>📷 Scan tickets to check in</Link>

      <div className="card" style={{ textAlign: "center" }}>
        <img className="qr" src={qr} alt={`QR for ${e.name}`} />
        <div className="muted">Scan to open the event page and register</div>
        <ShareButtons url={`${origin}/e/${e.slug}`} title={e.name} />
        <div className="row" style={{ marginTop: 8 }}>
          <a className="btn ghost" href={`/e/${e.slug}`} target="_blank">View event page</a>
          <a className="btn ghost" href={qr} download={`${e.slug}-qr.png`}>⬇ QR</a>
        </div>
      </div>

      <form action={updateEvent} className="card">
        <input type="hidden" name="id" value={e.id} />
        <h3>Event info</h3>
        <label className="f">Name</label><input name="name" defaultValue={e.name} required />
        <label className="f">About the event</label><textarea name="description" rows={4} defaultValue={e.description} placeholder="Theme, who it is for, prizes, rules…" />
        <label className="f">Agenda</label><textarea name="agenda" rows={4} defaultValue={e.agenda} placeholder={"10:00  Doors open\n11:00  Kick-off\n…"} />
        <label className="f">Venue</label><input name="location" defaultValue={e.location} placeholder="Address, or Online" />
        <div className="row">
          <div><label className="f">Starts</label><input name="startsAt" type="datetime-local" defaultValue={local(e.startsAt)} /></div>
          <div><label className="f">Ends</label><input name="endsAt" type="datetime-local" defaultValue={local(e.endsAt)} /></div>
        </div>
        <label className="f">Capacity (0 = unlimited)</label><input name="capacity" type="number" min={0} defaultValue={e.capacity} />
        <button>Save event info</button>
      </form>

      <form action={saveBranding} className="card">
        <input type="hidden" name="id" value={e.id} />
        <h3>Look &amp; feel</h3>
        <div style={{ height: 70, borderRadius: 14, marginBottom: 10, background: e.cover ? `linear-gradient(rgba(0,0,0,.25), rgba(0,0,0,.5)), url(/event-img/${e.slug}/cover) center/cover` : `linear-gradient(135deg, ${c1}, ${c2})`, display: "flex", alignItems: "center", padding: 12, gap: 10, color: "#fff" }}>
          {e.logo && <img src={`/event-img/${e.slug}/logo`} alt="" style={{ height: 44, width: 44, objectFit: "contain", background: "#fff", borderRadius: 10, padding: 3 }} />}
          <b>{e.name}</b>
        </div>
        <div className="row">
          <div><label className="f">Main colour</label><input name="color1" type="color" defaultValue={c1} style={{ padding: 2, height: 44 }} /></div>
          <div><label className="f">Second colour</label><input name="color2" type="color" defaultValue={c2} style={{ padding: 2, height: 44 }} /></div>
        </div>
        <label style={{ display: "block", margin: "0 0 8px" }}><input type="checkbox" name="resetColors" />Use my card colours instead</label>
        <label className="f">Logo (JPG, PNG, WebP, up to 5 MB)</label>
        <input name="logo" type="file" accept="image/png,image/jpeg,image/webp" />
        {e.logo && <label style={{ display: "block", margin: "0 0 8px" }}><input type="checkbox" name="rm_logo" />Remove current logo</label>}
        <label className="f">Cover / background image</label>
        <input name="cover" type="file" accept="image/png,image/jpeg,image/webp" />
        {e.cover && <label style={{ display: "block", margin: "0 0 8px" }}><input type="checkbox" name="rm_cover" />Remove current cover</label>}
        <button>Save look &amp; feel</button>
      </form>

      <h2>🎟 Attendees ({e.attendees.length})</h2>
      {e.attendees.length === 0 && <div className="card muted">Nobody has registered yet. Share the QR above.</div>}
      {e.attendees.map((a) => (
        <div className="card" key={a.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b>{a.name}</b> {a.checkedInAt && <span className="pill" style={{ background: "#e6f9ef", margin: 0 }}>✅ in at {time(a.checkedInAt)}</span>}
            <div className="muted">{a.email}{a.company ? ` · ${a.company}` : ""}</div>
            {a.interested && <div>{a.interested.split(",").map((jid) => e.jobs.find((j) => j.id === jid)).filter(Boolean).map((j) => <span key={j!.id} className="pill">🎯 {j!.title}</span>)}</div>}
          </div>
          <form action={setCheckedIn}>
            <input type="hidden" name="eventId" value={e.id} /><input type="hidden" name="id" value={a.id} /><input type="hidden" name="on" value={a.checkedInAt ? "0" : "1"} />
            <button className={a.checkedInAt ? "ghost sm" : "sm"} style={{ width: "auto" }}>{a.checkedInAt ? "Undo" : "Check in"}</button>
          </form>
          <form action={removeAttendee}><input type="hidden" name="eventId" value={e.id} /><input type="hidden" name="id" value={a.id} /><button className="ghost sm">✕</button></form>
        </div>
      ))}

      <h2>🎯 Roles hiring here ({e.jobs.length})</h2>
      {e.jobs.length === 0 && <div className="card muted">No roles linked. When you post a role in Recruiter mode, choose this event to show it on the event page.</div>}
      {e.jobs.map((j) => {
        const interest = e.attendees.filter((a) => a.interested.split(",").includes(j.id)).length;
        return (
          <Link key={j.id} href={`/app/profile/jobs/${j.id}`} className="menu-row">
            <span style={{ flex: 1, minWidth: 0 }}><b>{j.title}</b><span className="muted" style={{ display: "block" }}>{interest} interested at the event · {j._count.applications} applied</span></span><span className="muted">›</span>
          </Link>
        );
      })}
      <Link href="/app/profile/jobs" className="btn ghost" style={{ marginBottom: 12 }}>+ Post a role for this event</Link>

      <h2>💡 Projects ({e.projects.length})</h2>
      {e.projects.length === 0 && <div className="card muted">No projects submitted yet.</div>}
      {e.projects.map((p) => (
        <div className="card" key={p.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}><b>{p.name}</b><div className="muted">{p.submitter}{p.email ? ` · ${p.email}` : ""}</div></div>
          <form action={removeProject}><input type="hidden" name="eventId" value={e.id} /><input type="hidden" name="id" value={p.id} /><button className="ghost sm">Remove</button></form>
        </div>
      ))}

      <div className="row" style={{ marginTop: 6 }}>
        <form action={toggleEvent}><input type="hidden" name="id" value={e.id} /><button className="ghost">{e.open ? "Close registration" : "Reopen registration"}</button></form>
        <form action={deleteEvent}><input type="hidden" name="id" value={e.id} /><button className="ghost">Delete event</button></form>
      </div>
    </>
  );
}
