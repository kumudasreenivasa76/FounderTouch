import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { mkdir, writeFile } from "fs/promises";
import { randomBytes } from "crypto";
import path from "path";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { canView } from "@/lib/access";
import { gradient, byline } from "@/lib/look";
import { listItems } from "@/lib/modes";
import { parseSocials, socialUrl } from "@/lib/socials";
import Avatar from "@/components/avatar";
export const dynamic = "force-dynamic";

const here = (handle: string, jobId: string) => `/${handle}/apply/${jobId}`;
const evId = async (profileId: string, slug: string) => (slug ? (await db.event.findFirst({ where: { slug, profileId } }))?.id ?? "" : "");

async function load(handle: string, jobId: string) {
  const p = await db.profile.findUnique({ where: { handle } });
  const job = p ? await db.job.findFirst({ where: { id: jobId, profileId: p.id, open: true } }) : null;
  return { p, job };
}

/** One tap: apply using the signed-in visitor's own FounderTouch profile (their Hire me details travel with it). */
async function applyWithProfile(fd: FormData) {
  "use server";
  const handle = String(fd.get("handle")), jobId = String(fd.get("jobId"));
  const me = await currentUser();
  if (!me?.profile) redirect(`/login?next=${encodeURIComponent(here(handle, jobId))}`);
  const { p, job } = await load(handle, jobId);
  if (!p || !job || p.id === me.profile.id) redirect(here(handle, jobId));
  const mine = me.profile;
  const eventId = await evId(p.id, String(fd.get("event") ?? ""));
  const email = (mine.email || me.email).toLowerCase();
  if (await db.application.findUnique({ where: { jobId_email: { jobId: job.id, email } } })) redirect(`${here(handle, jobId)}?err=exists`);
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const resume = await db.resource.findFirst({ where: { profileId: mine.id, kind: "RESUME", gated: false }, orderBy: { createdAt: "asc" } });
  const resumeUrl = resume ? (resume.filePath ? `${origin}/files/${resume.id}` : resume.url) : `${origin}/${mine.handle}?mode=ALL&pane=hire`;
  await db.application.create({
    data: { jobId: job.id, profileId: p.id, name: mine.name, email, phone: mine.phone, linkedin: parseSocials(mine.socials).linkedin ?? "", resumeUrl, candidateHandle: mine.handle, eventId, note: String(fd.get("note") ?? "").trim().slice(0, 600) },
  });
  await db.contact.upsert({ where: { profileId_email: { profileId: p.id, email } }, update: { mode: "RECRUITER" }, create: { profileId: p.id, email, name: mine.name, mode: "RECRUITER" } });
  redirect(`${here(handle, jobId)}?sent=1`);
}

async function applyForm(fd: FormData) {
  "use server";
  const handle = String(fd.get("handle")), jobId = String(fd.get("jobId"));
  const { p, job } = await load(handle, jobId);
  if (!p || !job) redirect(`/${handle}?mode=RECRUITER`);
  const eventId = await evId(p.id, String(fd.get("event") ?? ""));
  const name = `${String(fd.get("firstName")).trim()} ${String(fd.get("lastName")).trim()}`.trim();
  const email = String(fd.get("email")).trim().toLowerCase();
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) redirect(`${here(handle, jobId)}?err=details`);
  if (await db.application.findUnique({ where: { jobId_email: { jobId: job.id, email } } })) redirect(`${here(handle, jobId)}?err=exists`);
  let resumeFile = "";
  const f = fd.get("resume") as File | null;
  if (f && f.size > 0) {
    const ext = path.extname(f.name).toLowerCase();
    if (![".pdf", ".doc", ".docx"].includes(ext) || f.size > 5 * 1024 * 1024) redirect(`${here(handle, jobId)}?err=file`);
    resumeFile = `resume-${randomBytes(10).toString("hex")}${ext}`;
    await mkdir(path.join(process.cwd(), "uploads"), { recursive: true });
    await writeFile(path.join(process.cwd(), "uploads", resumeFile), Buffer.from(await f.arrayBuffer()));
  }
  const url = String(fd.get("resumeUrl") ?? "").trim();
  await db.application.create({
    data: {
      jobId: job.id, profileId: p.id, name: name.slice(0, 80), email, phone: String(fd.get("phone") ?? "").trim().slice(0, 30), linkedin: socialUrl("linkedin", String(fd.get("linkedin") ?? "")),
      resumeUrl: url && !/^https?:\/\//i.test(url) ? "https://" + url : url, resumeFile, eventId, note: String(fd.get("note") ?? "").trim().slice(0, 600),
    },
  });
  await db.contact.upsert({ where: { profileId_email: { profileId: p.id, email } }, update: { mode: "RECRUITER" }, create: { profileId: p.id, email, name, mode: "RECRUITER" } });
  redirect(`${here(handle, jobId)}?sent=1`);
}

const ERR: Record<string, string> = {
  details: "Add your first name, last name and a valid email.",
  exists: "You have already applied for this role with that email.",
  file: "Upload a PDF, DOC or DOCX under 5 MB, or paste a link instead.",
};

export default async function Apply({ params, searchParams }: { params: Promise<{ handle: string; jobId: string }>; searchParams: Promise<{ sent?: string; err?: string; event?: string }> }) {
  const { handle, jobId } = await params;
  const sp = await searchParams;
  const { p, job } = await load(handle, jobId);
  if (!p || !job) notFound();
  const cfg = await db.modeConfig.findFirst({ where: { profileId: p.id, mode: "RECRUITER" } });
  if (cfg?.requireApproval && !(await canView(p, "RECRUITER", true))) redirect(`/${handle}?mode=RECRUITER`);
  const me = await currentUser();
  const mine = me?.profile && me.profile.id !== p.id ? me.profile : null;
  const mineStats = mine ? {
    jobs: await db.careerItem.count({ where: { profileId: mine.id, type: "EXPERIENCE" } }),
    edu: await db.careerItem.count({ where: { profileId: mine.id, type: "EDUCATION" } }),
    resume: await db.resource.count({ where: { profileId: mine.id, kind: "RESUME" } }),
    skills: listItems(mine.skills).length,
  } : null;
  const skills = listItems(job.skills);

  return (
    <div className="screen">
      <div className="card hero hero-themed" style={{ background: gradient(p.theme), border: 0 }}>
        <span className="pill">🎯 {p.company || p.name} is hiring</span>
        <h1 style={{ marginTop: 8 }}>{job.title}</h1>
        <div>{[job.location, job.workType, job.employment].filter(Boolean).join(" · ")}</div>
        {job.salary && <div style={{ marginTop: 4 }}>💰 {job.salary}</div>}
      </div>
      {job.description && <div className="card" style={{ whiteSpace: "pre-wrap" }}>{job.description}</div>}
      {skills.length > 0 && <div className="card"><h3>Skills</h3>{skills.map((s) => <span key={s} className="pill">{s}</span>)}</div>}

      {sp.sent ? (
        <div className="ok">Application sent ✓ {p.company || p.name} will get in touch if there is a fit.</div>
      ) : (
        <>
          {sp.err && <div className="err">{ERR[sp.err] ?? "Something went wrong."}</div>}

          {mine && mineStats && (
            <form action={applyWithProfile} className="card" style={{ borderColor: "#b2f2bb", background: "#f3fcf5" }}>
              <input type="hidden" name="handle" value={handle} /><input type="hidden" name="jobId" value={jobId} /><input type="hidden" name="event" value={sp.event ?? ""} />
              <b>⚡ Apply with your FounderTouch profile</b>
              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0" }}>
                <Avatar name={mine.name} handle={mine.handle} hasPhoto={!!mine.photo} avatar={mine.avatar} size={44} />
                <div style={{ minWidth: 0 }}><b>{mine.name}</b><div className="muted">{byline(mine.headline, mine.company)}</div></div>
              </div>
              <div className="muted" style={{ marginBottom: 8 }}>Shares your Hire me profile: {mineStats.jobs} experience, {mineStats.edu} education, {mineStats.skills} skills{mineStats.resume ? ", your resume" : ""}.</div>
              <input name="note" placeholder="Add a short note (optional)" maxLength={600} />
              <button>Apply in one tap</button>
            </form>
          )}
          {!me && <Link href={`/login?next=${encodeURIComponent(here(handle, jobId))}`} className="btn ghost" style={{ marginBottom: 12 }}>⚡ Have a FounderTouch profile? Log in to apply in one tap</Link>}

          <form action={applyForm} className="card">
            <input type="hidden" name="handle" value={handle} /><input type="hidden" name="jobId" value={jobId} /><input type="hidden" name="event" value={sp.event ?? ""} />
            <h3>{mine ? "Or apply with details" : "Apply for this role"}</h3>
            <div className="row"><input name="firstName" placeholder="First name" required /><input name="lastName" placeholder="Last name" required /></div>
            <input name="email" type="email" placeholder="Email" required />
            <input name="phone" type="tel" placeholder="Phone (optional)" />
            <input name="linkedin" placeholder="LinkedIn (optional)" />
            <input name="resumeUrl" placeholder="Link to your resume or portfolio" inputMode="url" autoCapitalize="none" />
            <label className="f">Or upload your resume (PDF or DOC, up to 5 MB)</label>
            <input name="resume" type="file" accept=".pdf,.doc,.docx" />
            <textarea name="note" rows={3} placeholder="Why are you a good fit? (optional)" maxLength={600} />
            <button>Send application</button>
            <p className="muted">{p.name} will see these details and can contact you about this role.</p>
          </form>
        </>
      )}
      <Link href={`/${handle}?mode=RECRUITER&pane=roles`} className="btn ghost">← All open roles</Link>
    </div>
  );
}
