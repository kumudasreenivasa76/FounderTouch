import QRCode from "qrcode";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { notify } from "@/lib/notify";
import { emit } from "@/lib/integrations";
import { logActivity } from "@/lib/activity";
import { themeOf, readable } from "@/lib/look";
import Avatar from "@/components/avatar";
import Swiper from "@/components/swiper";
import ShareButtons from "@/components/share-buttons";
import ProjectCard from "@/components/project-card";
export const dynamic = "force-dynamic";

const link = (v: FormDataEntryValue | null) => { const s = String(v ?? "").trim(); return s && !/^https?:\/\//i.test(s) ? "https://" + s : s; };
const ticketCookie = (eventId: string) => `tk_${eventId}`;

async function registerAttendee(fd: FormData) {
  "use server";
  const slug = String(fd.get("slug"));
  const ev = await db.event.findUnique({ where: { slug }, include: { tickets: true } });
  if (!ev || !ev.open || !ev.published) redirect(`/e/${slug}?pane=register&err=closed`);
  const now = new Date();
  if ((ev.regOpensAt && now < ev.regOpensAt) || (ev.regDeadline && now > ev.regDeadline)) redirect(`/e/${slug}?pane=register&err=window`);
  const name = `${String(fd.get("firstName")).trim()} ${String(fd.get("lastName")).trim()}`.trim();
  const email = String(fd.get("email")).trim().toLowerCase();
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) redirect(`/e/${slug}?pane=register&err=details`);
  if (await db.attendee.findUnique({ where: { eventId_email: { eventId: ev.id, email } } })) redirect(`/e/${slug}?pane=register&err=exists`);
  const held = { in: ["CONFIRMED", "PENDING"] };
  const guests = Math.max(0, Math.min(ev.plusOnes, parseInt(String(fd.get("guests") ?? "0"), 10) || 0));
  const seatRows = await db.attendee.findMany({ where: { eventId: ev.id, status: held }, select: { guests: true } });
  const taken = seatRows.length + seatRows.reduce((n, r) => n + r.guests, 0);
  let questions: string[] = []; try { questions = JSON.parse(ev.questions); } catch { /* none */ }
  const answers: Record<string, string> = {};
  questions.forEach((q, i) => { const v = String(fd.get("q" + i) ?? "").trim().slice(0, 300); if (v) answers[q] = v; });
  let status = ev.requireApproval || ev.visibility === "INVITE" ? "PENDING" : "CONFIRMED";
  if (ev.capacity > 0 && taken + 1 + guests > ev.capacity) { if (!ev.waitlist) redirect(`/e/${slug}?pane=register&err=full`); status = "WAITLIST"; }
  const tc = ev.tickets.find((t) => t.id === String(fd.get("ticket")));
  if (tc && tc.quota > 0 && (await db.attendee.count({ where: { eventId: ev.id, ticketClassId: tc.id, status: held } })) >= tc.quota) redirect(`/e/${slug}?pane=register&err=full`);
  const wanted = new Set(fd.getAll("jobs").map(String));
  const evJobs = await db.job.findMany({ where: { eventId: ev.id, open: true }, select: { id: true } });
  const interested = evJobs.map((j) => j.id).filter((id) => wanted.has(id)).join(",");
  const a = await db.attendee.create({ data: { eventId: ev.id, interested, name: name.slice(0, 80), email, company: String(fd.get("company") ?? "").trim().slice(0, 80), token: randomBytes(12).toString("hex"), status, ticketClassId: tc?.id ?? "", consentComms: fd.get("cComms") === "on", consentCard: fd.get("cCard") === "on", consentRecruiter: fd.get("cRecruiter") === "on", guests, answers: JSON.stringify(answers) } });
  emit(ev.profileId, "event.registered", { event: ev.name, name, email, company: a.company, status, ticketType: tc?.name ?? "General" });
  await notify("registration", email, a.id, status === "CONFIRMED" ? `Your ticket for ${ev.name}` : `We received your registration for ${ev.name}`, status === "CONFIRMED" ? `Hi ${name}, you are registered for ${ev.name}. Your ticket: /e/${ev.slug}/ticket/${a.token}` : `Hi ${name}, your registration for ${ev.name} is ${status.toLowerCase()}. We will email you when it is confirmed.`);
  const ct = await db.contact.upsert({ where: { profileId_email: { profileId: ev.profileId, email } }, update: { lastInteractionAt: new Date(), interactions: { increment: 1 }, mode: "ALL" }, create: { profileId: ev.profileId, email, name, company: a.company, mode: "ALL", source: "event", metAt: ev.name } });
  await logActivity(ct.id, "event", `Registered for ${ev.name}${status === "CONFIRMED" ? "" : " (" + status.toLowerCase() + ")"}`);
  (await cookies()).set(ticketCookie(ev.id), a.token, { path: "/", maxAge: 60 * 60 * 24 * 120, sameSite: "lax" });
  redirect(`/e/${slug}/ticket/${a.token}`);
}

async function submitProject(fd: FormData) {
  "use server";
  const slug = String(fd.get("slug"));
  const ev = await db.event.findUnique({ where: { slug } });
  if (!ev || !ev.open) redirect(`/e/${slug}?pane=add&err=closed`);
  const name = String(fd.get("name")).trim();
  const submitter = `${String(fd.get("firstName")).trim()} ${String(fd.get("lastName")).trim()}`.trim();
  const email = String(fd.get("email")).trim().toLowerCase();
  if (!name || !submitter || !/^\S+@\S+\.\S+$/.test(email)) redirect(`/e/${slug}?pane=add&err=details`);
  if ((await db.project.count({ where: { eventId: ev.id, email } })) >= 3) redirect(`/e/${slug}?pane=add&err=limit`);
  const clip = (s: string, n: number) => s.slice(0, n);
  await db.project.create({
    data: {
      profileId: ev.profileId, eventId: ev.id, name: clip(name, 80), tagline: clip(String(fd.get("tagline")).trim(), 140), description: clip(String(fd.get("description")).trim(), 1200),
      demoUrl: link(fd.get("demoUrl")), repoUrl: link(fd.get("repoUrl")), team: clip(String(fd.get("team")).trim(), 200), submitter: clip(submitter, 80), email,
    },
  });
  await db.contact.upsert({ where: { profileId_email: { profileId: ev.profileId, email } }, update: { lastInteractionAt: new Date(), interactions: { increment: 1 }, mode: "ALL" }, create: { profileId: ev.profileId, email, name: submitter, mode: "ALL", source: "event" } });
  revalidatePath(`/e/${slug}`);
  redirect(`/e/${slug}?pane=projects&added=1`);
}

const ERR: Record<string, string> = {
  closed: "Registration and submissions are closed for this event.",
  details: "Add your first name, last name and a valid email.",
  limit: "You have already added 3 projects to this event.",
  full: "This event is full.",
  window: "Registration is not open at the moment.",
  exists: "That email is already registered. Open the ticket on the device you registered with, or ask the organizer.",
};
const gcal = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const countdown = (d: Date) => {
  const ms = d.getTime() - Date.now();
  if (ms <= 0) return "Happening now";
  const days = Math.floor(ms / 86400_000), hrs = Math.floor((ms % 86400_000) / 3600_000);
  return days > 0 ? `Starts in ${days} day${days === 1 ? "" : "s"}${days < 3 ? ` ${hrs}h` : ""}` : hrs > 0 ? `Starts in ${hrs} hour${hrs === 1 ? "" : "s"}` : "Starting soon";
};
const when = (s: Date | null, e: Date | null) => {
  if (!s) return "";
  const f = (d: Date) => d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  return e ? `${f(s)} to ${f(e)}` : f(s);
};

export default async function EventPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ pane?: string; err?: string; added?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const ev = await db.event.findUnique({ where: { slug }, include: { tickets: true, links: { orderBy: { order: "asc" } }, profile: true, projects: { orderBy: { createdAt: "desc" } }, jobs: { where: { open: true }, orderBy: { createdAt: "desc" } }, _count: { select: { attendees: true } } } });
  if (!ev || !ev.published) notFound();
  const going = await db.attendee.findMany({ where: { eventId: ev.id, status: "CONFIRMED" }, orderBy: { createdAt: "desc" }, select: { name: true, guests: true, consentCard: true } });
  const seatsTaken = (await db.attendee.findMany({ where: { eventId: ev.id, status: { in: ["CONFIRMED", "PENDING"] } }, select: { guests: true } })).reduce((n, r) => n + 1 + r.guests, 0);
  const spotsLeft = ev.capacity > 0 ? Math.max(0, ev.capacity - seatsTaken) : null;
  let questions: string[] = []; try { questions = JSON.parse(ev.questions); } catch { /* none */ }
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const qr = await QRCode.toDataURL(`${origin}/e/${ev.slug}`, { margin: 1, width: 420 });
  const o = ev.profile;
  const t = themeOf(o.theme);
  const c1 = ev.color1 || t.from, c2 = ev.color2 || t.to;
  const ended = !!ev.endsAt && ev.endsAt.getTime() < Date.now();
  const full = spotsLeft === 0 && !ev.waitlist;
  const myToken = (await cookies()).get(ticketCookie(ev.id))?.value;
  const mine = myToken ? await db.attendee.findUnique({ where: { token: myToken } }) : null;
  const myTicket = mine && mine.eventId === ev.id ? mine : null;
  const heroBg = ev.cover ? `linear-gradient(rgba(0,0,0,.3), rgba(0,0,0,.6)), url(/event-img/${ev.slug}/cover) center/cover` : `linear-gradient(135deg, ${c1}, ${c2})`;

  const about = (
    <>
      <div className="card hero hero-themed" style={{ background: heroBg, border: 0 }}>
        {ev.logo && <img src={`/event-img/${ev.slug}/logo`} alt="" style={{ height: 76, maxWidth: 160, objectFit: "contain", background: "#fff", borderRadius: 16, padding: 6, margin: "0 auto 10px", display: "block" }} />}
        <span className="pill">{ended ? "Event ended" : full ? "Sold out" : spotsLeft !== null && spotsLeft <= 10 ? `Only ${spotsLeft} places left` : ev.open ? "Registration open" : "Registration closed"}</span>
        <h1 style={{ marginTop: 8 }}>{ev.name}</h1>
        {ev.summary && <div>{ev.summary}</div>}
        {ev.startsAt && (
          <div className="ev-when">
            <div className="ev-date" aria-hidden><b>{ev.startsAt.toLocaleDateString("en-IN", { day: "2-digit" })}</b><span>{ev.startsAt.toLocaleDateString("en-IN", { month: "short" })}</span></div>
            <div style={{ textAlign: "left" }}><b>{when(ev.startsAt, ev.endsAt)}</b>{!ended && <div>{countdown(ev.startsAt)}</div>}</div>
          </div>
        )}
        {(ev.location || ev.onlineUrl) && <div style={{ marginTop: 6 }}>{ev.location && <>{ev.location} <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.location)}`} target="_blank" rel="noopener noreferrer" style={{ color: "#fff", textDecoration: "underline" }}>Directions</a></>}{ev.onlineUrl && <div>Online event</div>}</div>}
        {myTicket
          ? <Link className="btn" style={{ marginTop: 12 }} href={`/e/${ev.slug}/ticket/${myTicket.token}`}>View my ticket</Link>
          : ev.open && !full && !ended && <Link className="btn" style={{ marginTop: 12 }} href={`/e/${ev.slug}?pane=register`}>Register now</Link>}
      </div>
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex" }} aria-hidden>
            {going.filter((g) => g.consentCard).slice(0, 5).map((g, i) => <span key={i} className="ev-face" style={{ marginLeft: i ? -8 : 0 }}>{g.name[0]?.toUpperCase()}</span>)}
          </div>
          <b>{going.length === 0 ? "Be the first to register" : `${going.reduce((n, g) => n + 1 + g.guests, 0)} going`}</b>
        </div>
        {spotsLeft !== null && ev.capacity > 0 && <div className="meter" role="progressbar" aria-label="Places taken" aria-valuenow={Math.round((seatsTaken / ev.capacity) * 100)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${Math.min(100, (seatsTaken / ev.capacity) * 100)}%` }} /></div>}
        {ev.startsAt && (
          <div className="row" style={{ marginTop: 8, flexWrap: "wrap" }}>
            <a className="btn ghost" href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ev.name)}&dates=${gcal(ev.startsAt)}/${gcal(ev.endsAt ?? new Date(ev.startsAt.getTime() + 2 * 3600_000))}&details=${encodeURIComponent(ev.summary || ev.description.slice(0, 300))}&location=${encodeURIComponent(ev.onlineUrl || ev.location)}`} target="_blank" rel="noopener noreferrer">Google Calendar</a>
            <a className="btn ghost" href={`https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(ev.name)}&startdt=${ev.startsAt.toISOString()}&enddt=${(ev.endsAt ?? new Date(ev.startsAt.getTime() + 2 * 3600_000)).toISOString()}&location=${encodeURIComponent(ev.onlineUrl || ev.location)}`} target="_blank" rel="noopener noreferrer">Outlook</a>
            <a className="btn ghost" href={`/e/${ev.slug}/ics`}>Apple / file</a>
          </div>
        )}
      </div>
      {ev.description && <div className="card" style={{ whiteSpace: "pre-wrap" }}>{ev.description}</div>}
      {ev.links.length > 0 && <div className="card"><h2 style={{ fontSize: 15 }}>Links</h2>{ev.links.map((l) => <a key={l.id} className="btn ghost" style={{ marginRight: 8 }} href={l.url} target="_blank" rel="noopener noreferrer">{l.label} ↗</a>)}</div>}
      {ev.agenda && <div className="card"><h2 style={{ fontSize: 15 }}>Agenda</h2><div style={{ whiteSpace: "pre-wrap" }}>{ev.agenda}</div></div>}
      <div className="card" style={{ textAlign: "center" }}>
        <img className="qr" src={qr} alt={`QR code for ${ev.name}`} />
        <div className="muted">Scan to open this event</div>
        <ShareButtons url={`${origin}/e/${ev.slug}`} title={ev.name} />
      </div>
      <Link href={`/${o.handle}`} className="menu-row">
        <Avatar name={o.name} handle={o.handle} hasPhoto={!!o.photo} avatar={o.avatar} size={40} />
        <span style={{ flex: 1 }}><span className="muted" style={{ display: "block" }}>Organized by</span><b>{o.name}</b></span><span className="muted">›</span>
      </Link>
    </>
  );

  const register = myTicket ? (
    <div className="card" style={{ textAlign: "center" }}>
      <h2 style={{ fontSize: 15 }}>{myTicket.status === "CONFIRMED" ? "You are registered " : myTicket.status === "PENDING" ? "Waiting for approval" : myTicket.status === "WAITLIST" ? "You are on the waitlist" : "Registration cancelled"}</h2>
      <p className="muted">{myTicket.status === "CONFIRMED" ? "Show your ticket QR at the door." : "We will email you when this changes."}</p>
      <Link className="btn" href={`/e/${ev.slug}/ticket/${myTicket.token}`}>Open my ticket</Link>
      <a className="btn ghost" style={{ marginTop: 8 }} href={`/e/${ev.slug}/ics`}>Add to calendar</a>
    </div>
  ) : (
    <form action={registerAttendee} className="card">
      <input type="hidden" name="slug" value={ev.slug} />
      <h2 style={{ fontSize: 15 }}>Register</h2>
      {sp.err && <div className="err">{ERR[sp.err] ?? "Something went wrong."}</div>}
      {!ev.open || ended ? <p className="muted">Registration is closed.</p> : full ? <p className="muted">This event is full.</p> : (
        <>
          <div className="row"><input name="firstName" placeholder="First name" required /><input name="lastName" placeholder="Last name" required /></div>
          <input name="email" type="email" placeholder="Email" required />
          <input name="company" placeholder="Company or college (optional)" />
          {ev.plusOnes > 0 && <><label className="f" htmlFor="guests">Guests you are bringing</label><select id="guests" name="guests" defaultValue="0">{Array.from({ length: ev.plusOnes + 1 }, (_, n) => <option key={n} value={n}>{n === 0 ? "Just me" : `+${n}`}</option>)}</select></>}
          {questions.map((q, i) => <div key={i}><label className="f" htmlFor={`q${i}`}>{q}</label><input id={`q${i}`} name={`q${i}`} maxLength={300} /></div>)}
          {ev.tickets.length > 0 && <select name="ticket" aria-label="Ticket type">{ev.tickets.map((t) => <option key={t.id} value={t.id}>{t.name}{t.price ? ` · ${t.price} ${t.currency}` : " · free"}</option>)}</select>}
          {ev.jobs.length > 0 && (
            <>
              <label className="f">Roles you would like to talk about (optional)</label>
              {ev.jobs.map((j) => <label key={j.id} style={{ display: "block", margin: "4px 0" }}><input type="checkbox" name="jobs" value={j.id} />{j.title}</label>)}
            </>
          )}
          <label style={{ display: "block", margin: "6px 0" }}><input type="checkbox" name="cComms" />Email me about this event</label>
          <label style={{ display: "block", margin: "6px 0" }}><input type="checkbox" name="cCard" />Let other attendees see my card for networking</label>
          <label style={{ display: "block", margin: "6px 0" }}><input type="checkbox" name="cRecruiter" />Recruiters at this event may contact me</label>
          <button>{ev.requireApproval || ev.visibility === "INVITE" ? "Request a place" : "Get my ticket"}</button>
          <p className="muted">You get a QR ticket to show at check-in. {o.name} can contact you about this event.</p>
        </>
      )}
    </form>
  );

  const roles = (
    <>
      <p className="muted" style={{ marginTop: 0 }}>{o.company || o.name} is hiring at this event.</p>
      {ev.jobs.map((j) => (
        <div className="card" key={j.id}>
          <b style={{ fontSize: 16 }}>{j.title}</b>
          <div className="muted">{[j.location, j.workType, j.employment].filter(Boolean).join(" · ")}</div>
          {j.salary && <div style={{ marginTop: 4 }}>{j.salary}</div>}
          {j.description && <p style={{ whiteSpace: "pre-wrap", margin: "8px 0" }}>{j.description.length > 200 ? j.description.slice(0, 200) + "…" : j.description}</p>}
          <a className="btn" href={`/${o.handle}/apply/${j.id}?event=${ev.slug}`}>Apply →</a>
        </div>
      ))}
    </>
  );

  const projects = (
    <>
      {sp.added && <div className="ok">Your project was added </div>}
      {ev.projects.length === 0 && <div className="card muted">No projects yet. Be the first to add yours.</div>}
      {ev.projects.map((p) => <ProjectCard key={p.id} p={p} origin={origin} />)}
    </>
  );

  const add = (
    <form action={submitProject} className="card">
      <input type="hidden" name="slug" value={ev.slug} />
      <h2 style={{ fontSize: 15 }}>Add your project</h2>
      {sp.err && sp.pane === "add" && <div className="err">{ERR[sp.err] ?? "Something went wrong."}</div>}
      {!ev.open ? <p className="muted">Submissions are closed for this event.</p> : (
        <>
          <input name="name" placeholder="Project name" required />
          <input name="tagline" placeholder="One-line pitch" />
          <textarea name="description" rows={3} placeholder="What it does" />
          <input name="demoUrl" placeholder="Demo link (YouTube, Loom, Vimeo, Drive, MP4 or any site)" inputMode="url" autoCapitalize="none" />
          <input name="repoUrl" placeholder="Code link (GitHub)" inputMode="url" autoCapitalize="none" />
          <input name="team" placeholder="Team (names, comma separated)" />
          <div className="row"><input name="firstName" placeholder="Your first name" required /><input name="lastName" placeholder="Last name" required /></div>
          <input name="email" type="email" placeholder="Your email" required />
          <button>Submit project</button>
          <p className="muted">The organizer, {o.name}, can contact you about this event.</p>
        </>
      )}
    </form>
  );

  const pages = [
    { key: "about", label: "Event", node: about },
    { key: "register", label: myTicket ? "My ticket" : "Register", node: register },
    ...(ev.jobs.length > 0 ? [{ key: "roles", label: `Hiring (${ev.jobs.length})`, node: roles }] : []),
    { key: "projects", label: `Projects (${ev.projects.length})`, node: projects },
    { key: "add", label: "Add yours", node: add },
  ];
  const start = Math.max(0, pages.findIndex((x) => x.key === sp.pane));
  return (
    <div style={{ display: "contents", ["--accent" as string]: readable(c1) }}>
      <Swiper main heading={ev.name} labels={pages.map((x) => x.label)} initial={start}>{pages.map((x) => <div key={x.key}>{x.node}</div>)}</Swiper>
    </div>
  );
}
