import QRCode from "qrcode";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { themeOf } from "@/lib/look";
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
  const ev = await db.event.findUnique({ where: { slug }, include: { _count: { select: { attendees: true } } } });
  if (!ev || !ev.open) redirect(`/e/${slug}?pane=register&err=closed`);
  const name = `${String(fd.get("firstName")).trim()} ${String(fd.get("lastName")).trim()}`.trim();
  const email = String(fd.get("email")).trim().toLowerCase();
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) redirect(`/e/${slug}?pane=register&err=details`);
  if (ev.capacity > 0 && ev._count.attendees >= ev.capacity) redirect(`/e/${slug}?pane=register&err=full`);
  if (await db.attendee.findUnique({ where: { eventId_email: { eventId: ev.id, email } } })) redirect(`/e/${slug}?pane=register&err=exists`);
  const wanted = new Set(fd.getAll("jobs").map(String));
  const evJobs = await db.job.findMany({ where: { eventId: ev.id, open: true }, select: { id: true } });
  const interested = evJobs.map((j) => j.id).filter((id) => wanted.has(id)).join(",");
  const a = await db.attendee.create({ data: { eventId: ev.id, interested, name: name.slice(0, 80), email, company: String(fd.get("company") ?? "").trim().slice(0, 80), token: randomBytes(12).toString("hex") } });
  await db.contact.upsert({ where: { profileId_email: { profileId: ev.profileId, email } }, update: { mode: "HACKATHON" }, create: { profileId: ev.profileId, email, name, company: a.company, mode: "HACKATHON" } });
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
  await db.contact.upsert({ where: { profileId_email: { profileId: ev.profileId, email } }, update: { mode: "HACKATHON" }, create: { profileId: ev.profileId, email, name: submitter, mode: "HACKATHON" } });
  revalidatePath(`/e/${slug}`);
  redirect(`/e/${slug}?pane=projects&added=1`);
}

const ERR: Record<string, string> = {
  closed: "Registration and submissions are closed for this event.",
  details: "Add your first name, last name and a valid email.",
  limit: "You have already added 3 projects to this event.",
  full: "This event is full.",
  exists: "That email is already registered. Open the ticket on the device you registered with, or ask the organizer.",
};
const when = (s: Date | null, e: Date | null) => {
  if (!s) return "";
  const f = (d: Date) => d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  return e ? `${f(s)} to ${f(e)}` : f(s);
};

export default async function EventPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ pane?: string; err?: string; added?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const ev = await db.event.findUnique({ where: { slug }, include: { profile: true, projects: { orderBy: { createdAt: "desc" } }, jobs: { where: { open: true }, orderBy: { createdAt: "desc" } }, _count: { select: { attendees: true } } } });
  if (!ev) notFound();
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const qr = await QRCode.toDataURL(`${origin}/e/${ev.slug}`, { margin: 1, width: 420 });
  const o = ev.profile;
  const t = themeOf(o.theme);
  const c1 = ev.color1 || t.from, c2 = ev.color2 || t.to;
  const ended = !!ev.endsAt && ev.endsAt.getTime() < Date.now();
  const full = ev.capacity > 0 && ev._count.attendees >= ev.capacity;
  const myToken = (await cookies()).get(ticketCookie(ev.id))?.value;
  const mine = myToken ? await db.attendee.findUnique({ where: { token: myToken } }) : null;
  const myTicket = mine && mine.eventId === ev.id ? mine : null;
  const heroBg = ev.cover ? `linear-gradient(rgba(0,0,0,.3), rgba(0,0,0,.6)), url(/event-img/${ev.slug}/cover) center/cover` : `linear-gradient(135deg, ${c1}, ${c2})`;

  const about = (
    <>
      <div className="card hero hero-themed" style={{ background: heroBg, border: 0 }}>
        {ev.logo && <img src={`/event-img/${ev.slug}/logo`} alt="" style={{ height: 76, maxWidth: 160, objectFit: "contain", background: "#fff", borderRadius: 16, padding: 6, margin: "0 auto 10px", display: "block" }} />}
        <span className="pill">🏆 {ended ? "Event ended" : full ? "Event full" : ev.open ? "Open" : "Closed"}</span>
        <h1 style={{ marginTop: 8 }}>{ev.name}</h1>
        {when(ev.startsAt, ev.endsAt) && <div>🗓 {when(ev.startsAt, ev.endsAt)}</div>}
        {ev.location && <div>📍 {ev.location}</div>}
        {myTicket
          ? <Link className="btn" style={{ marginTop: 12 }} href={`/e/${ev.slug}/ticket/${myTicket.token}`}>🎟 View my ticket</Link>
          : ev.open && !full && !ended && <Link className="btn" style={{ marginTop: 12 }} href={`/e/${ev.slug}?pane=register`}>Register now</Link>}
      </div>
      {ev.description && <div className="card" style={{ whiteSpace: "pre-wrap" }}>{ev.description}</div>}
      {ev.agenda && <div className="card"><h3>Agenda</h3><div style={{ whiteSpace: "pre-wrap" }}>{ev.agenda}</div></div>}
      <div className="card" style={{ textAlign: "center" }}>
        <img className="qr" src={qr} alt={`QR code for ${ev.name}`} />
        <div className="muted">Scan to open this event</div>
        <ShareButtons url={`${origin}/e/${ev.slug}`} title={ev.name} />
      </div>
      <Link href={`/${o.handle}?mode=HACKATHON`} className="menu-row">
        <Avatar name={o.name} handle={o.handle} hasPhoto={!!o.photo} avatar={o.avatar} size={40} />
        <span style={{ flex: 1 }}><span className="muted" style={{ display: "block" }}>Organized by</span><b>{o.name}</b></span><span className="muted">›</span>
      </Link>
    </>
  );

  const register = myTicket ? (
    <div className="card" style={{ textAlign: "center" }}>
      <h3>You&apos;re registered ✅</h3>
      <p className="muted">Show your ticket QR at the door.</p>
      <Link className="btn" href={`/e/${ev.slug}/ticket/${myTicket.token}`}>🎟 Open my ticket</Link>
    </div>
  ) : (
    <form action={registerAttendee} className="card">
      <input type="hidden" name="slug" value={ev.slug} />
      <h3>Register</h3>
      {sp.err && <div className="err">{ERR[sp.err] ?? "Something went wrong."}</div>}
      {!ev.open || ended ? <p className="muted">Registration is closed.</p> : full ? <p className="muted">This event is full.</p> : (
        <>
          <div className="row"><input name="firstName" placeholder="First name" required /><input name="lastName" placeholder="Last name" required /></div>
          <input name="email" type="email" placeholder="Email" required />
          <input name="company" placeholder="Company or college (optional)" />
          {ev.jobs.length > 0 && (
            <>
              <label className="f">Roles you would like to talk about (optional)</label>
              {ev.jobs.map((j) => <label key={j.id} style={{ display: "block", margin: "4px 0" }}><input type="checkbox" name="jobs" value={j.id} />{j.title}</label>)}
            </>
          )}
          <button>Get my ticket</button>
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
          {j.salary && <div style={{ marginTop: 4 }}>💰 {j.salary}</div>}
          {j.description && <p style={{ whiteSpace: "pre-wrap", margin: "8px 0" }}>{j.description.length > 200 ? j.description.slice(0, 200) + "…" : j.description}</p>}
          <a className="btn" href={`/${o.handle}/apply/${j.id}?event=${ev.slug}`}>Apply →</a>
        </div>
      ))}
    </>
  );

  const projects = (
    <>
      {sp.added && <div className="ok">Your project was added 🎉</div>}
      {ev.projects.length === 0 && <div className="card muted">No projects yet. Be the first to add yours.</div>}
      {ev.projects.map((p) => <ProjectCard key={p.id} p={p} origin={origin} />)}
    </>
  );

  const add = (
    <form action={submitProject} className="card">
      <input type="hidden" name="slug" value={ev.slug} />
      <h3>Add your project</h3>
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
    <div style={{ display: "contents", ["--accent" as string]: c1 }}>
      <Swiper labels={pages.map((x) => x.label)} initial={start}>{pages.map((x) => <div key={x.key}>{x.node}</div>)}</Swiper>
    </div>
  );
}
