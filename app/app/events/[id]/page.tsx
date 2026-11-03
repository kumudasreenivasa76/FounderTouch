import QRCode from "qrcode";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { themeOf } from "@/lib/look";
import PageHead from "@/components/page-head";
import ShareButtons from "@/components/share-buttons";
import { setAttendeeStatus, addTicketClass, removeTicketClass } from "../actions";
import { sendAnnouncement, duplicateEvent } from "../actions";
import { addLink, removeLink, addStaff, removeStaff, addPlan, removePlan } from "../extra-actions";
import { STAFF_ROLES } from "@/lib/event-access";
import { deleteEvent, removeAttendee, removeProject, saveBranding, setCheckedIn, toggleEvent, updateEvent, setPublished } from "../actions";
export const dynamic = "force-dynamic";

const ERR: Record<string, string> = { name: "Give the event a name.", link: "Add a label and an https:// link.", msg: "Add a subject and a message.", staff: "That email has no FounderTouch account yet.", img: "Images must be JPG, PNG or WebP under 5 MB." };
const local = (d: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
const time = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

export default async function ManageEvent({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ err?: string; saved?: string; q?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { profile } = await requireOwner();
  const e = await db.event.findFirst({
    where: { id, profileId: profile.id },
    include: { announcements: { orderBy: { createdAt: "desc" }, take: 3 }, tickets: true, staff: true, links: { orderBy: { order: "asc" } }, voucherPlans: { include: { vouchers: true } }, scans: { orderBy: { createdAt: "desc" }, take: 8 }, attendees: { orderBy: [{ checkedInAt: "desc" }, { createdAt: "desc" }] }, projects: { orderBy: { createdAt: "desc" } }, jobs: { include: { _count: { select: { applications: true } } }, orderBy: { createdAt: "desc" } } },
  });
  if (!e) notFound();
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const qr = await QRCode.toDataURL(`${origin}/e/${e.slug}`, { margin: 1, width: 420 });
  const t = themeOf(profile.theme);
  const c1 = e.color1 || t.from, c2 = e.color2 || t.to;
  const checked = e.attendees.filter((a) => a.checkedInAt).length;
  const confirmed = e.attendees.filter((a) => a.status === "CONFIRMED").length;
  const pending = e.attendees.filter((a) => a.status === "PENDING").length;
  const waitlisted = e.attendees.filter((a) => a.status === "WAITLIST").length;
  const guestTotal = e.attendees.filter((a) => a.status === "CONFIRMED" || a.status === "PENDING").reduce((n, a) => n + a.guests, 0);
  const seats = e.attendees.filter((a) => a.status === "CONFIRMED" || a.status === "PENDING").length + guestTotal;
  const day0 = new Date(); day0.setHours(0, 0, 0, 0); day0.setDate(day0.getDate() - 13);
  const regs = Array.from({ length: 14 }, (_, i) => { const d = new Date(day0); d.setDate(d.getDate() + i); return e.attendees.filter((a) => a.createdAt.toDateString() === d.toDateString()).length; });
  const regMax = Math.max(1, ...regs);
  const q = (sp.q ?? "").trim().toLowerCase();
  const shown = e.attendees.filter((a) => !q || `${a.name} ${a.email} ${a.company}`.toLowerCase().includes(q));
  const questions: string[] = (() => { try { return JSON.parse(e.questions); } catch { return []; } })();
  const mods: string[] = (() => { try { return JSON.parse(e.modules); } catch { return []; } })();

  return (
    <>
      <PageHead title={e.name} back="/app/events" saved={!!sp.saved} error={sp.err ? ERR[sp.err] : undefined} />

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <b style={{ fontSize: 22 }}>{seats}{e.capacity ? <span className="muted"> / {e.capacity}</span> : null}</b>
          <span className="muted">{e.capacity ? `${Math.max(0, e.capacity - seats)} places left` : "places taken (no limit)"}</span>
        </div>
        {e.capacity > 0 && <div className="meter" role="progressbar" aria-label="Places taken" aria-valuenow={Math.min(100, Math.round((seats / e.capacity) * 100))} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${Math.min(100, (seats / e.capacity) * 100)}%` }} /></div>}
        <div className="muted">{confirmed} confirmed · {pending} to approve · {waitlisted} on waitlist · {guestTotal} guests</div>
        <div className="bars" role="img" aria-label={`Registrations over the last 14 days: ${regs.reduce((n, x) => n + x, 0)}`}>{regs.map((c, n) => <div key={n} className={n === 13 ? "hi" : ""} style={{ height: `${(c / regMax) * 100}%` }} />)}</div>
        <div className="bars-l"><span>14 days ago</span><span style={{ textAlign: "right" }}>today</span></div>
      </div>
      <div className="stat">
        <div className="card"><b>{checked}</b><span className="muted">checked in</span></div>
        <div className="card"><b>{confirmed ? Math.round((checked / confirmed) * 100) : 0}%</b><span className="muted">turned up</span></div>
        <div className="card"><b>{e.projects.length}</b><span className="muted">projects</span></div>
      </div>
      <Link href={`/app/events/${e.id}/scan`} className="btn" style={{ marginBottom: 12 }}>Scan tickets to check in</Link>

      <div className="card" style={{ textAlign: "center" }}>
        <img className="qr" src={qr} alt={`QR for ${e.name}`} />
        <div className="muted">Scan to open the event page and register</div>
        <ShareButtons url={`${origin}/e/${e.slug}`} title={e.name} />
        <div className="row" style={{ marginTop: 8 }}>
          <a className="btn ghost" href={`/e/${e.slug}`} target="_blank">View event page</a>
          <a className="btn ghost" href={qr} download={`${e.slug}-qr.png`}>QR</a>
        </div>
      </div>

      <form action={duplicateEvent}><input type="hidden" name="id" value={e.id} /><button className="ghost" style={{ marginBottom: 12 }}>⧉ Duplicate this event</button></form>
      <div className="card" style={{ borderColor: e.published ? "#b2f2bb" : "#ffd8a8", background: e.published ? "#f3fcf5" : "#fff9f0" }}>
        <b>{e.published ? "Published" : "Draft: not visible to the public yet"}</b>
        <form action={setPublished} style={{ marginTop: 8 }}>
          <input type="hidden" name="id" value={e.id} /><input type="hidden" name="on" value={e.published ? "0" : "1"} />
          <button className={e.published ? "ghost" : ""}>{e.published ? "Unpublish" : "Publish event"}</button>
        </form>
      </div>

      <form action={updateEvent} className="card">
        <input type="hidden" name="id" value={e.id} />
        <h2 style={{ fontSize: 15 }}>Event info</h2>
        <label className="f">Name</label><input name="name" defaultValue={e.name} required />
        <label className="f">About the event</label><textarea name="description" rows={4} defaultValue={e.description} placeholder="Theme, who it is for, prizes, rules…" />
        <label className="f">Agenda</label><textarea name="agenda" rows={4} defaultValue={e.agenda} placeholder={"10:00  Doors open\n11:00  Kick-off\n…"} />
        <label className="f">Venue</label><input name="location" defaultValue={e.location} placeholder="Address, or Online" />
        <div className="row">
          <div><label className="f">Starts</label><input name="startsAt" type="datetime-local" defaultValue={local(e.startsAt)} /></div>
          <div><label className="f">Ends</label><input name="endsAt" type="datetime-local" defaultValue={local(e.endsAt)} /></div>
        </div>
        <label className="f">Capacity (0 = unlimited)</label><input name="capacity" type="number" min={0} defaultValue={e.capacity} />
        <label className="f" htmlFor="ev-plus">Guests each person may bring</label>
        <input id="ev-plus" name="plusOnes" type="number" min={0} max={10} defaultValue={e.plusOnes} />
        <label className="f" htmlFor="ev-q">Questions to ask when people register (one per line, up to 8)</label>
        <textarea id="ev-q" name="questions" rows={3} defaultValue={questions.join("\n")} placeholder={"Dietary needs?\nWhat would you like to learn?"} />
        <label className="f">Short summary</label><input name="summary" maxLength={200} defaultValue={e.summary} />
        <div className="row">
          <div><label className="f">Format</label><select name="format" defaultValue={e.format}><option value="IN_PERSON">In person</option><option value="ONLINE">Online</option><option value="HYBRID">Hybrid</option></select></div>
          <div><label className="f">Visibility</label><select name="visibility" defaultValue={e.visibility}><option value="PUBLIC">Public</option><option value="UNLISTED">Unlisted</option><option value="INVITE">Invite only (needs approval)</option></select></div>
        </div>
        <label className="f">Online link (https)</label><input name="onlineUrl" defaultValue={e.onlineUrl} inputMode="url" placeholder="Zoom or Meet link" />
        <div className="row">
          <div><label className="f">Timezone</label><input name="timezone" defaultValue={e.timezone} /></div>
          <div><label className="f">Contact email</label><input name="contactEmail" type="email" defaultValue={e.contactEmail} /></div>
        </div>
        <div className="row">
          <div><label className="f">Registration opens</label><input name="regOpensAt" type="datetime-local" defaultValue={local(e.regOpensAt)} /></div>
          <div><label className="f">Registration closes</label><input name="regDeadline" type="datetime-local" defaultValue={local(e.regDeadline)} /></div>
        </div>
        <label className="f">Tags</label><input name="tags" defaultValue={e.tags} placeholder="ai, startups" />
        <label className="f">Refund policy</label><textarea name="refundPolicy" rows={2} defaultValue={e.refundPolicy} />
        <label style={{ display: "block", margin: "6px 0" }}><input type="checkbox" name="requireApproval" defaultChecked={e.requireApproval} />I approve each registration</label>
        <label style={{ display: "block", margin: "6px 0" }}><input type="checkbox" name="waitlist" defaultChecked={e.waitlist} />Waitlist when full</label>
        <label style={{ display: "block", margin: "6px 0" }}><input type="checkbox" name="published" defaultChecked={e.published} />Published (untick to hide the public page)</label>
        <label className="f">Optional modules</label>
        {["vouchers", "hackathon", "recruiting"].map((m) => <label key={m} style={{ display: "block", margin: "4px 0" }}><input type="checkbox" name={"mod_" + m} defaultChecked={mods.includes(m)} />{m === "vouchers" ? "Meal vouchers" : m === "hackathon" ? "Hackathon (projects & links)" : "Recruiting"}</label>)}
        <button>Save event info</button>
      </form>

      <form action={saveBranding} className="card">
        <input type="hidden" name="id" value={e.id} />
        <h2 style={{ fontSize: 15 }}>Look &amp; feel</h2>
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

      <h2>Ticket types</h2>
      <div className="card">
        {e.tickets.map((t) => (
          <form key={t.id} action={removeTicketClass} className="row" style={{ marginBottom: 6 }}>
            <input type="hidden" name="eventId" value={e.id} /><input type="hidden" name="id" value={t.id} />
            <span><b>{t.name}</b> · {t.quota ? `${t.quota} places` : "unlimited"} · {t.price ? `${t.price} ${t.currency} (not collected online yet)` : "free"}</span><button className="ghost">Remove</button>
          </form>
        ))}
        <form action={addTicketClass} className="row" style={{ flexWrap: "wrap" }}>
          <input type="hidden" name="eventId" value={e.id} />
          <input name="name" placeholder="General, VIP, Student…" maxLength={40} required />
          <input name="quota" type="number" min={0} placeholder="Places (0 = any)" style={{ width: 120 }} />
          <input name="price" type="number" min={0} placeholder="Price" style={{ width: 90 }} />
          <button>Add</button>
        </form>
        <p className="muted" style={{ marginBottom: 0 }}>Without ticket types everyone gets a general ticket. Paid tickets are recorded but payment is not collected in the app.</p>
      </div>

      <h2>Staff &amp; roles ({e.staff.length})</h2>
      <div className="card">
        <p className="muted" style={{ marginTop: 0 }}>Staff need a FounderTouch account. Check-in staff can scan tickets; vendors can only redeem meals.</p>
        {e.staff.map((st) => (
          <form key={st.id} action={removeStaff} className="row" style={{ marginBottom: 6 }}>
            <input type="hidden" name="eventId" value={e.id} /><input type="hidden" name="id" value={st.id} />
            <span>{st.role.toLowerCase()} · {st.userId.slice(0, 6)}{st.scope ? ` · ${e.voucherPlans.find((p) => p.id === st.scope)?.name ?? ""}` : ""}</span><button className="ghost">Remove</button>
          </form>
        ))}
        <form action={addStaff} className="row" style={{ flexWrap: "wrap" }}>
          <input type="hidden" name="eventId" value={e.id} />
          <input name="email" type="email" placeholder="their account email" required />
          <select name="role">{STAFF_ROLES.map((r) => <option key={r} value={r}>{r.toLowerCase()}</option>)}</select>
          <select name="scope" aria-label="Meal (vendors)"><option value="">all meals</option>{e.voucherPlans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <button>Add</button>
        </form>
      </div>

      {mods.includes("vouchers") && <><h2>Meal vouchers</h2>
      <div className="card">
        {e.voucherPlans.map((p) => (
          <form key={p.id} action={removePlan} className="row" style={{ marginBottom: 6 }}>
            <input type="hidden" name="eventId" value={e.id} /><input type="hidden" name="id" value={p.id} />
            <span><b>{p.name}</b> · {p.perPerson} each · {p.vouchers.filter((v) => v.state === "REDEEMED").length} redeemed</span><button className="ghost">Remove</button>
          </form>
        ))}
        <form action={addPlan} className="row" style={{ flexWrap: "wrap" }}>
          <input type="hidden" name="eventId" value={e.id} />
          <input name="name" placeholder="Lunch, Dinner…" maxLength={40} required />
          <input name="perPerson" type="number" min={1} max={10} defaultValue={1} aria-label="Per person" style={{ width: 80 }} />
          <button>Add meal</button>
        </form>
        {e.voucherPlans.length > 0 && <Link className="btn ghost" style={{ marginTop: 8 }} href={`/app/events/${e.id}/meals`}>Open meal scanner</Link>}
      </div></>}

      <h2>Links</h2>
      <div className="card">
        {e.links.map((l) => (
          <form key={l.id} action={removeLink} className="row" style={{ marginBottom: 6 }}>
            <input type="hidden" name="eventId" value={e.id} /><input type="hidden" name="id" value={l.id} />
            <span>{l.label} <span className="muted">· {l.purpose}</span></span><button className="ghost">Remove</button>
          </form>
        ))}
        <form action={addLink} className="row" style={{ flexWrap: "wrap" }}>
          <input type="hidden" name="eventId" value={e.id} />
          <input name="label" placeholder="Devpost, Discord…" maxLength={60} required />
          <input name="url" placeholder="https://" inputMode="url" required />
          <select name="purpose">{["registration", "submission", "schedule", "community", "judging", "resources", "other"].map((p) => <option key={p}>{p}</option>)}</select>
          <button>Add link</button>
        </form>
        <p className="muted" style={{ marginBottom: 0 }}>These are plain links. Nothing is synced with those platforms.</p>
      </div>

      {e.scans.length > 0 && <p className="muted">Recent scans: {e.scans.map((x) => `${x.scanType.toLowerCase()} ${x.result}`).join(" · ")}</p>}

      <h2>Message your guests</h2>
      <form action={sendAnnouncement} className="card">
        <input type="hidden" name="eventId" value={e.id} />
        <label className="f" htmlFor="an-sub">Subject</label>
        <input id="an-sub" name="subject" maxLength={120} placeholder="Reminder: doors open at 6" />
        <label className="f" htmlFor="an-body">Message</label>
        <textarea id="an-body" name="body" rows={3} maxLength={2000} />
        <button>Send to {confirmed} confirmed {confirmed === 1 ? "guest" : "guests"}</button>
        {e.announcements.length > 0 && <p className="muted" style={{ marginBottom: 0 }}>Last sent: {e.announcements.map((a) => `“${a.subject}” to ${a.sent}`).join(" · ")}</p>}
      </form>

      <h2>Attendees ({e.attendees.length})</h2>
      <form method="get" className="row" style={{ marginBottom: 8 }}>
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Search guests" aria-label="Search guests" />
        <button className="ghost" style={{ width: "auto" }}>Search</button>
        <a className="btn ghost" href={`/app/events/${e.id}/export`} style={{ width: "auto" }}>CSV</a>
      </form>
      {e.attendees.length === 0 && <div className="card muted">Nobody has registered yet. Share the QR above.</div>}
      {shown.map((a) => (
        <div className="card" key={a.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b>{a.name}</b> {a.status !== "CONFIRMED" && <span className="pill" style={{ margin: 0 }}>{a.status.toLowerCase()}</span>} {a.checkedInAt && <span className="pill" style={{ background: "#e6f9ef", margin: 0 }}>in at {time(a.checkedInAt)}</span>}
            <div className="muted">{a.email}{a.company ? ` · ${a.company}` : ""}{a.guests ? ` · +${a.guests} guest${a.guests === 1 ? "" : "s"}` : ""}</div>
            {a.answers !== "{}" && (() => { try { return Object.entries(JSON.parse(a.answers) as Record<string, string>).filter(([, v]) => v).map(([k, v]) => <div key={k} className="muted">{k}: {v}</div>); } catch { return null; } })()}
            {a.interested && <div>{a.interested.split(",").map((jid) => e.jobs.find((j) => j.id === jid)).filter(Boolean).map((j) => <span key={j!.id} className="pill">{j!.title}</span>)}</div>}
          </div>
          {(a.status === "PENDING" || a.status === "WAITLIST") && (
            <form action={setAttendeeStatus}><input type="hidden" name="eventId" value={e.id} /><input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value="CONFIRMED" /><button className="sm" style={{ width: "auto" }}>{a.status === "PENDING" ? "Approve" : "Promote"}</button></form>
          )}
          <form action={setCheckedIn}>
            <input type="hidden" name="eventId" value={e.id} /><input type="hidden" name="id" value={a.id} /><input type="hidden" name="on" value={a.checkedInAt ? "0" : "1"} />
            <button className={a.checkedInAt ? "ghost sm" : "sm"} style={{ width: "auto" }}>{a.checkedInAt ? "Undo" : "Check in"}</button>
          </form>
          <form action={removeAttendee}><input type="hidden" name="eventId" value={e.id} /><input type="hidden" name="id" value={a.id} /><button className="ghost sm"></button></form>
        </div>
      ))}

      {mods.includes("recruiting") && <Link className="btn ghost" href={`/app/events/${e.id}/recruit`}>Open recruiter panel</Link>}
      <h2>Roles hiring here ({e.jobs.length})</h2>
      {e.jobs.length === 0 && <div className="card muted">No roles linked. When you post a role in Recruiter mode, choose this event to show it on the event page.</div>}
      {e.jobs.map((j) => {
        const interest = e.attendees.filter((a) => a.interested.split(",").includes(j.id)).length;
        return (
          <Link key={j.id} href={`/app/profile/jobs/${j.id}`} className="menu-row">
            <span style={{ flex: 1, minWidth: 0 }}><b>{j.title}</b><span className="muted" style={{ display: "block" }}>{interest} interested at the event · {j._count.applications} applied</span></span><span className="muted">›</span>
          </Link>
        );
      })}
      <Link href="/app/hire" className="btn ghost" style={{ marginBottom: 12 }}>+ Post a role for this event</Link>

      <h2>Projects ({e.projects.length})</h2>
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
