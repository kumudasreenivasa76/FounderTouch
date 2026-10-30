import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { embedFor, isDirectVideo, isPublicOrigin } from "@/lib/embed";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { canView } from "@/lib/access";
import { currentUser } from "@/lib/auth";
import { modeHasContent } from "@/lib/mode-content";
import ModeSelect from "@/components/mode-select";
import { bookingInfo } from "@/lib/booking";
import { MODES, MODE_INFO, Mode, kindLabel, kindsOf, listItems, parseFields } from "@/lib/modes";
import Avatar from "@/components/avatar";
import { tagList } from "@/lib/tags";
import { SocialBadge } from "@/components/social-icon";
import { socialUrl } from "@/lib/socials";
import { gradient, byline } from "@/lib/look";
import Swiper from "@/components/swiper";
import ProjectCard from "@/components/project-card";
import { byStartDesc, fmtRange } from "@/lib/career";
import { SOCIALS, parseSocials } from "@/lib/socials";
export const dynamic = "force-dynamic";

async function exchange(fd: FormData) {
  "use server";
  const handle = String(fd.get("handle")), mode = String(fd.get("mode"));
  const p = await db.profile.findUnique({ where: { handle } });
  const email = String(fd.get("email")).trim().toLowerCase();
  const fullName = `${String(fd.get("firstName")).trim()} ${String(fd.get("lastName")).trim()}`.trim();
  if (!p || !email || !fullName) return;
  await db.contact.upsert({
    where: { profileId_email: { profileId: p.id, email } },
    update: { name: fullName, company: String(fd.get("company")), mode, linkedin: socialUrl("linkedin", String(fd.get("linkedin") ?? "")) },
    create: { profileId: p.id, email, name: fullName, company: String(fd.get("company")), mode, linkedin: socialUrl("linkedin", String(fd.get("linkedin") ?? "")) },
  });
  revalidatePath(`/${handle}`);
}

/** Visitor asks to unlock a whole mode that the owner has set to "approval required". */
async function requestModeAccess(fd: FormData) {
  "use server";
  const handle = String(fd.get("handle")), mode = String(fd.get("mode"));
  const name = `${String(fd.get("firstName")).trim()} ${String(fd.get("lastName")).trim()}`.trim(), email = String(fd.get("email")).trim().toLowerCase();
  const p = await db.profile.findUnique({ where: { handle } });
  const cfg = p ? await db.modeConfig.findFirst({ where: { profileId: p.id, mode } }) : null;
  if (!p || !cfg?.requireApproval) redirect(`/${handle}?mode=${mode}`);
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) redirect(`/${handle}?mode=${mode}&error=1`);
  await db.contact.upsert({ where: { profileId_email: { profileId: p.id, email } }, update: { name, mode }, create: { profileId: p.id, email, name, mode } });
  const open = await db.modeRequest.findFirst({ where: { profileId: p.id, mode, email, status: { in: ["PENDING", "APPROVED"] } } });
  if (!open) await db.modeRequest.create({ data: { profileId: p.id, mode, name, email, note: String(fd.get("note") ?? "").trim().slice(0, 300), token: randomBytes(16).toString("hex") } });
  redirect(`/${handle}?mode=${mode}&requested=1`);
}

/** Saves this person's card to the signed-in visitor's wallet (they sign in first if needed). */
async function saveCard(fd: FormData) {
  "use server";
  const handle = String(fd.get("handle")), mode = String(fd.get("mode"));
  const here = `/${handle}?mode=${mode}`;
  const me = await currentUser();
  if (!me) redirect(`/login?next=${encodeURIComponent(here)}`);
  const p = await db.profile.findUnique({ where: { handle } });
  if (!p || p.userId === me.id) redirect(here);
  await db.savedCard.upsert({ where: { userId_profileId: { userId: me.id, profileId: p.id } }, update: { mode }, create: { userId: me.id, profileId: p.id, mode } });
  redirect(`${here}&saved=1`);
}

/** A signed-in recruiter invites this candidate to apply for one of their open roles. */
async function inviteCandidate(fd: FormData) {
  "use server";
  const handle = String(fd.get("handle")), jobId = String(fd.get("jobId"));
  const here = `/${handle}?mode=${String(fd.get("mode"))}&pane=hire`;
  const me = await currentUser();
  if (!me?.profile) redirect(`/login?next=${encodeURIComponent(here)}`);
  const cand = await db.profile.findUnique({ where: { handle } });
  const job = await db.job.findFirst({ where: { id: jobId, profileId: me.profile.id, open: true } });
  if (!cand || !job || cand.id === me.profile.id) redirect(here);
  await db.invite.upsert({ where: { jobId_candidateProfileId: { jobId: job.id, candidateProfileId: cand.id } }, update: {}, create: { jobId: job.id, recruiterProfileId: me.profile.id, candidateProfileId: cand.id } });
  redirect(`${here}&invited=1`);
}

async function requestAccess(fd: FormData) {
  "use server";
  const handle = String(fd.get("handle")), mode = String(fd.get("mode"));
  const name = `${String(fd.get("firstName")).trim()} ${String(fd.get("lastName")).trim()}`.trim(), email = String(fd.get("email")).trim().toLowerCase();
  const p = await db.profile.findUnique({ where: { handle } });
  const r = await db.resource.findUnique({ where: { id: String(fd.get("resourceId")) } });
  if (!p || !r || r.profileId !== p.id || !r.gated || !name || !/^\S+@\S+\.\S+$/.test(email)) return;
  await db.contact.upsert({
    where: { profileId_email: { profileId: p.id, email } },
    update: { name, mode },
    create: { profileId: p.id, email, name, mode },
  });
  const open = await db.deckRequest.findFirst({ where: { resourceId: r.id, email, status: { in: ["PENDING", "APPROVED"] } } });
  if (!open) await db.deckRequest.create({ data: { resourceId: r.id, profileId: p.id, name, email, token: randomBytes(16).toString("hex") } });
  revalidatePath(`/${handle}`);
}

export default async function Public({ params, searchParams }: { params: Promise<{ handle: string }>; searchParams: Promise<{ mode?: string; tag?: string; pane?: string; requested?: string; error?: string; saved?: string; invited?: string }> }) {
  const { handle } = await params;
  const sp = await searchParams;
  const p = await db.profile.findUnique({ where: { handle }, include: { sections: true, modes: true, resources: { orderBy: { createdAt: "asc" } }, team: { orderBy: { order: "asc" } }, events: { orderBy: { startsAt: "asc" } }, projects: { where: { eventId: null }, orderBy: { createdAt: "desc" } }, career: true, jobs: { where: { open: true }, orderBy: { createdAt: "desc" } } } });
  if (!p) notFound();
  const mode = (MODES as readonly string[]).includes(sp.mode ?? "") ? sp.mode! : "ALL";
  const cfg = p.modes.find((m) => m.mode === mode);
  if (!cfg || !cfg.isEnabled) notFound();
  const me = await currentUser();
  const isOwner = me?.profile?.id === p.id;
  if (!isOwner && !modeHasContent(mode, cfg, p.resources, { projects: p.projects.length, events: p.events.length, jobs: p.jobs.length, career: p.career.length + (p.skills.trim() || p.openTo ? 1 : 0), projectModes: p.projects.flatMap((x) => x.modes.split(",").filter(Boolean)) })) notFound();
  if (!(await canView(p, mode, cfg.requireApproval))) {
    const info = MODE_INFO[mode as Mode];
    return (
      <div className="screen">
        <div className="card hero hero-themed" style={{ background: gradient(p.theme), border: 0, position: "relative" }}>
        {p.logo && <img className="brand-logo" src={`/logo/${p.handle}?v=${encodeURIComponent(p.logo)}`} alt={p.company ? `${p.company} logo` : ""} />}
          <Avatar name={p.name} handle={p.handle} hasPhoto={!!p.photo} avatar={p.avatar} size={88} flip center />
          <h1>{p.name}</h1>
          <div>{byline(p.headline, p.company)}</div>
          <span className="pill" style={{ marginTop: 8 }}>🔒 {info.label} · private</span>
        </div>
        {sp.requested ? (
          <div className="ok">Request sent ✓ {p.name} will review it and send you a private link.</div>
        ) : (
          <form action={requestModeAccess} className="card">
            <h3>Request access</h3>
            <p className="muted" style={{ marginTop: 0 }}>{p.name} approves each person before sharing the {info.label.toLowerCase()} page.</p>
            {sp.error && <div className="err">Add your first name, last name and a valid email.</div>}
            <input type="hidden" name="handle" value={handle} /><input type="hidden" name="mode" value={mode} />
            <div className="row"><input name="firstName" placeholder="First name" required /><input name="lastName" placeholder="Last name" required /></div>
            <input name="email" type="email" placeholder="Your email" required />
            <input name="note" placeholder="Why would you like access? (optional)" maxLength={300} />
            <button>Request access</button>
            <p className="muted">{p.name} can contact you about this request.</p>
          </form>
        )}
      </div>
    );
  }
  const enabled = MODES.filter((k) => k !== "ALL").map((k) => p.modes.find((m) => m.mode === k)).filter((m): m is NonNullable<typeof m> => !!m && m.isEnabled && modeHasContent(m.mode, m, p.resources, { projects: p.projects.length, events: p.events.length, jobs: p.jobs.length, career: p.career.length + (p.skills.trim() || p.openTo ? 1 : 0), projectModes: p.projects.flatMap((x) => x.modes.split(",").filter(Boolean)) }));
  const myJobs = me?.profile && !isOwner ? await db.job.findMany({ where: { profileId: me.profile.id, open: true }, orderBy: { createdAt: "desc" } }) : [];
  const invitedJobs = myJobs.length ? new Set((await db.invite.findMany({ where: { candidateProfileId: p.id, jobId: { in: myJobs.map((j) => j.id) } } })).map((i) => i.jobId)) : new Set<string>();
  const alreadySaved = me && !isOwner ? await db.savedCard.findUnique({ where: { userId_profileId: { userId: me.id, profileId: p.id } } }) : null;

  const inModes = (...m: string[]) => m.includes(mode);
  // This mode's kit: only items the owner put in it ("All" shows everything).
  const inKit = (r: { modes: string }) => mode === "ALL" || r.modes.split(",").includes(mode);
  const kitText = cfg.kitText || (mode === "FOUNDER" ? p.product : "");
  const h = await headers();
  const booking = cfg.bookingUrl ? bookingInfo(cfg.bookingUrl, h.get("host") ?? "") : null;
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const socials = parseSocials(p.socials);
  const linked = await db.profile.findMany({ where: { handle: { in: p.team.map((t) => t.memberHandle).filter(Boolean) } } });
  const showTeam = p.team.length > 0;
  type Res = (typeof p.resources)[number];
  const href = (r: Res) => (r.filePath ? `/files/${r.id}` : r.url);
  const group = (k: string) => (kindsOf(mode).includes(k as never) ? p.resources.filter((r) => r.kind === k && inKit(r)) : []);
  const isVideo = (r: Res) => r.mime.startsWith("video/");
  const link = { marginBottom: 8 } as const;
  const demo = (r: Res) => {
    const frame = { width: "100%", borderRadius: 12, marginBottom: 8, background: "#000" } as const;
    const src = r.filePath ? (isVideo(r) ? href(r) : null) : isDirectVideo(r.url) ? r.url : null;
    const embed = src ? null : embedFor(r, origin);
    return (
      <div key={r.id} style={{ marginBottom: 12 }}>
        <b style={{ display: "block", marginBottom: 6 }}>{r.title}</b>
        {src && <video src={src} controls playsInline preload="metadata" style={frame} />}
        {embed && <iframe src={embed} title={r.title} loading="lazy" allowFullScreen allow="autoplay; fullscreen; picture-in-picture" style={{ ...frame, aspectRatio: "16 / 9", border: 0 }} />}
        {!src && !embed && <a className="btn ghost" href={href(r)} target="_blank" rel="noopener noreferrer">▶ Watch demo</a>}
        {(src || embed) && r.url && <a className="muted" href={r.url} target="_blank" rel="noopener noreferrer">Open original ↗</a>}
      </div>
    );
  };
  const viewer = (r: Res) => {
    const src = embedFor(r, origin);
    const ext = r.filePath.toLowerCase().match(/\.(pptx?|docx?)$/);
    return (
      <div key={r.id} style={{ marginBottom: 12 }}>
        <b style={{ display: "block", marginBottom: 6 }}>{r.title}</b>
        {src
          ? <iframe src={src} title={r.title} loading="lazy" allowFullScreen style={{ width: "100%", height: 340, border: "1px solid #e3e6ec", borderRadius: 12, background: "#fff" }} />
          : ext && !isPublicOrigin(origin) && <p className="muted" style={{ margin: "0 0 6px" }}>Inline preview of PowerPoint/Word files works once the site is online. Upload a PDF to preview it anywhere.</p>}
        <a className="btn ghost" style={{ marginTop: 8 }} href={href(r)} target="_blank">{src ? "Open full screen ↗" : "📄 Open " + r.title}</a>
      </div>
    );
  };
  const locked = (r: Res) => (
    <details key={r.id} className="card" style={{ background: "#f6f7f9", padding: 10, marginBottom: 8 }}>
      <summary>🔒 {r.title} <span className="muted">· request access</span></summary>
      <form action={requestAccess}>
        <input type="hidden" name="handle" value={handle} /><input type="hidden" name="mode" value={mode} /><input type="hidden" name="resourceId" value={r.id} />
        <div className="row"><input name="firstName" placeholder="First name" required /><input name="lastName" placeholder="Last name" required /></div><input name="email" type="email" placeholder="Your email" required />
        <button>Request access</button>
        <p className="muted" style={{ margin: "6px 0 0" }}>{p.name} will review your request and send you a private link.</p>
      </form>
    </details>
  );

  const hasDocs = group("DOC").length > 0 || group("SUPPORT").length > 0;
  const resume = group("RESUME").find((r) => !r.gated);
  const hasContact = !!(p.company || p.website || p.email || p.phone || Object.keys(socials).length > 0);

  const meP = (
    <>
      <div className="card hero hero-themed" style={{ background: gradient(p.theme), border: 0, position: "relative" }}>
        {p.logo && <img className="brand-logo" src={`/logo/${p.handle}?v=${encodeURIComponent(p.logo)}`} alt={p.company ? `${p.company} logo` : ""} />}
        <Avatar name={p.name} handle={p.handle} hasPhoto={!!p.photo} avatar={p.avatar} size={88} flip center />
        <h1>{p.name}</h1>
        <div>{byline(p.headline, p.company)}</div>
        <span className="pill" style={{ marginTop: 8 }}>{MODE_INFO[mode as Mode].icon} {MODE_INFO[mode as Mode].label}</span>
        {mode === "RECRUITER" && p.jobs.length > 0 && <div><span className="pill on" style={{ background: "#fff", color: "#0b7a4b" }}>🟢 Hiring · {p.jobs.length} open role{p.jobs.length === 1 ? "" : "s"}</span></div>}
        {p.bio && <p className="muted" style={{ margin: "4px 0 12px" }}>{p.bio}</p>}
        {mode === "RECRUITER" && p.jobs.length > 0 && <a className="btn" style={{ marginBottom: 8 }} href={`/${handle}?mode=RECRUITER&pane=roles`}>See open roles ({p.jobs.length})</a>}
        {booking && (booking.embed
          ? <a className="btn" style={{ marginBottom: 8 }} href={`/${handle}?mode=${mode}&pane=book`}>{cfg.ctaLabel}</a>
          : <a className="btn" style={{ marginBottom: 8 }} href={cfg.bookingUrl} target="_blank" rel="noopener noreferrer">{cfg.ctaLabel}</a>)}
        <a className="btn ghost" href={`/${handle}/vcard?mode=${mode}`}>⬇ Save contact</a>
        {!isOwner && (alreadySaved || sp.saved
          ? <div className="pill" style={{ marginTop: 8, display: "block", textAlign: "center", padding: "10px 12px" }}>✓ Saved to your wallet</div>
          : <form action={saveCard} style={{ marginTop: 8 }}><input type="hidden" name="handle" value={handle} /><input type="hidden" name="mode" value={mode} /><button className="ghost">💾 Save card</button></form>)}
        {resume && <a className="btn ghost" style={{ marginTop: 8 }} href={`/${handle}?mode=${mode}&pane=hire`}>📄 View resume</a>}
        {socials.linkedin && <a className="btn ghost" style={{ marginTop: 8 }} href={socials.linkedin} target="_blank" rel="noopener noreferrer">in Connect on LinkedIn</a>}
      </div>
      {cfg.intro && <div className="card" style={{ background: "#eef1ff", borderColor: "#d7defb" }}>👋 {cfg.intro}</div>}
      {enabled.length > 0 && (mode === "ALL" || enabled.length > 1) && (
        <div className="card"><b>I am a…</b>
          <div style={{ marginTop: 8 }}>
            <ModeSelect handle={handle} current={mode} placeholder={mode === "ALL" ? "Choose who you are" : "Switch to another view"}
              options={[...enabled.map((m) => ({ value: m.mode, label: `${MODE_INFO[m.mode as Mode].icon} ${MODE_INFO[m.mode as Mode].label}` })), ...(mode !== "ALL" ? [{ value: "ALL", label: "✨ Everything" }] : [])]} />
          </div>
        </div>
      )}
    </>
  );
  // This mode's own details (portfolio, services, skills…): only the ones that are filled in.
  const fv = parseFields(cfg.fields);
  const fieldDefs = MODE_INFO[mode as Mode].fields.filter((f) => fv[f.key]);
  const detailsP = fieldDefs.length > 0 && (
    <div className="card"><h3>Details</h3>
      {fieldDefs.filter((f) => f.type !== "url").map((f) => (
        <div key={f.key} style={{ marginBottom: 10 }}>
          <div className="muted">{f.label}</div>
          {f.key === "process" ? <ol style={{ margin: "4px 0 0", paddingLeft: 20 }}>{fv[f.key].split(/\r?\n/).map((x) => x.trim()).filter(Boolean).map((x) => <li key={x} style={{ marginBottom: 4 }}>{x}</li>)}</ol> : f.type === "list" ? <div>{listItems(fv[f.key]).map((x) => <span key={x} className="pill">{x}</span>)}</div> : <div style={{ whiteSpace: "pre-wrap" }}>{fv[f.key]}</div>}
        </div>
      ))}
      {fieldDefs.filter((f) => f.type === "url").map((f) => (
        <a key={f.key} className="btn ghost" style={link} href={fv[f.key]} target="_blank" rel="noopener noreferrer">🔗 {f.label} ↗</a>
      ))}
    </div>
  );
  const productP = (
    <>
      {kitText && <div className="card"><h3>{MODE_INFO[mode as Mode].about}</h3><div style={{ whiteSpace: "pre-wrap" }}>{kitText}</div></div>}
      {detailsP}
      {group("DECK").length > 0 && <div className="card"><h3>{kindLabel(mode, "DECK")}</h3>{group("DECK").map((r) => r.gated ? locked(r) : viewer(r))}</div>}
    </>
  );
  const demoP = <div className="card"><h3>{kindLabel(mode, "DEMO")}</h3>{group("DEMO").map((r) => r.gated ? locked(r) : demo(r))}</div>;
  const teamP = (
    <div className="card"><h3>Team{p.company ? ` at ${p.company}` : ""}</h3>
      {p.team.map((t) => {
        const lp = linked.find((x) => x.handle === t.memberHandle);
        const nm = lp?.name ?? t.name, role = t.role || lp?.headline || "";
        const row = (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
            <Avatar name={nm} handle={lp?.handle ?? ""} hasPhoto={!!lp?.photo} avatar={lp?.avatar ?? ""} size={44} />
            <div style={{ flex: 1 }}><b>{nm}</b><div className="muted">{role}</div></div>
            {t.link && <span className="pill" style={{ margin: 0 }}>View ↗</span>}
          </div>
        );
        return t.link ? <a key={t.id} href={t.link} target={t.memberHandle ? undefined : "_blank"} rel="noopener noreferrer" style={{ color: "inherit", display: "block" }}>{row}</a> : <div key={t.id}>{row}</div>;
      })}
    </div>
  );
  const docsP = (
    <>
      {group("DOC").length > 0 && (
        <div className="card"><h3>{kindLabel(mode, "DOC")}</h3>
          {group("DOC").map((r) => r.gated ? locked(r) : <a key={r.id} className="btn ghost" style={link} href={href(r)} target="_blank">📎 {r.title}</a>)}
        </div>
      )}
      {group("SUPPORT").length > 0 && (() => {
        const all = group("SUPPORT");
        const tags = [...new Set(all.flatMap((r) => tagList(r.tags)))].sort();
        const active = sp.tag && tags.includes(sp.tag) ? sp.tag : "";
        const shown = active ? all.filter((r) => tagList(r.tags).includes(active)) : all;
        const q = (t: string) => `/${handle}?mode=${mode}&pane=docs${t ? "&tag=" + encodeURIComponent(t) : ""}`;
        return (
          <div className="card"><h3>{kindLabel(mode, "SUPPORT")}</h3>
            {tags.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <a className={"pill" + (!active ? " on" : "")} href={q("")}>All</a>
                {tags.map((t) => <a key={t} className={"pill" + (active === t ? " on" : "")} href={q(t)}>#{t}</a>)}
              </div>
            )}
            {shown.map((r) => r.gated ? locked(r) : (
              <a key={r.id} className="btn ghost" style={{ ...link, textAlign: "left" }} href={href(r)} target="_blank">
                📎 {r.title}
                {tagList(r.tags).length > 0 && <span style={{ display: "block", fontSize: 12, opacity: 0.7, fontWeight: 400 }}>{tagList(r.tags).map((t) => "#" + t).join("  ")}</span>}
              </a>
            ))}
          </div>
        );
      })()}
    </>
  );
  // Hire me: status, skills, experience, education, resume and portfolio together.
  const showCareer = mode === "ALL" || mode === "HIRE" || p.hireModes.split(",").includes(mode);
  const jobs = showCareer ? p.career.filter((c) => c.type === "EXPERIENCE").sort(byStartDesc) : [];
  const schools = showCareer ? p.career.filter((c) => c.type === "EDUCATION").sort(byStartDesc) : [];
  const skillList = showCareer ? listItems(p.skills) : [];
  const openTo = showCareer ? p.openTo : "";
  const portfolioLink = showCareer ? socials.portfolio : undefined;
  const hasHire = !!(openTo || skillList.length || jobs.length || schools.length || group("RESUME").length || group("PORTFOLIO").length || portfolioLink);
  const timeline = (c: (typeof p.career)[number]) => (
    <div key={c.id} style={{ borderLeft: "3px solid #d7defb", padding: "2px 0 2px 12px", marginBottom: 12 }}>
      <b>{c.title}</b>
      <div>{c.org}{c.location ? ` · ${c.location}` : ""}</div>
      {fmtRange(c.start, c.end) && <div className="muted">{fmtRange(c.start, c.end)}</div>}
      {c.description && <div className="muted" style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{c.description}</div>}
    </div>
  );
  const hireP = (
    <>
      {showCareer && myJobs.length > 0 && openTo !== "Not looking" && (
        <form action={inviteCandidate} className="card" style={{ background: "#eef1ff", borderColor: "#d7defb" }}>
          <input type="hidden" name="handle" value={handle} /><input type="hidden" name="mode" value={mode} />
          <b>🎯 Invite {p.firstName || p.name} to apply</b>
          {sp.invited && <div className="ok" style={{ marginTop: 8 }}>Invite sent ✓</div>}
          <select name="jobId" style={{ marginTop: 8 }}>{myJobs.map((j) => <option key={j.id} value={j.id}>{j.title}{invitedJobs.has(j.id) ? " (invited)" : ""}</option>)}</select>
          <button>Send invite</button>
        </form>
      )}
      {(openTo || skillList.length > 0) && (
        <div className="card">
          {openTo && <div style={{ marginBottom: skillList.length ? 10 : 0 }}><span className="pill on" style={{ margin: 0 }}>{openTo === "Not looking" ? "⚪" : "🟢"} {openTo}</span></div>}
          {skillList.length > 0 && <><h3>Skills</h3><div>{skillList.map((x) => <span key={x} className="pill">{x}</span>)}</div></>}
        </div>
      )}
      {jobs.length > 0 && <div className="card"><h3>💼 Experience</h3>{jobs.map(timeline)}</div>}
      {schools.length > 0 && <div className="card"><h3>🎓 Education</h3>{schools.map(timeline)}</div>}
      {group("RESUME").length > 0 && <div className="card"><h3>📄 {kindLabel(mode, "RESUME")}</h3>{group("RESUME").map((r) => r.gated ? locked(r) : viewer(r))}</div>}
      {portfolioLink && <div className="card"><h3>🗂️ Portfolio</h3><a className="btn ghost" href={portfolioLink} target="_blank" rel="noopener noreferrer">Open my portfolio ↗</a></div>}
      {group("PORTFOLIO").length > 0 && <div className="card"><h3>🗂️ {kindLabel(mode, "PORTFOLIO")}</h3>{group("PORTFOLIO").map((r) => r.gated ? locked(r) : viewer(r))}</div>}
    </>
  );
  const rolesP = (
    <>
      {p.jobs.map((j) => (
        <div className="card" key={j.id}>
          <b style={{ fontSize: 16 }}>{j.title}</b>
          <div className="muted">{[j.location, j.workType, j.employment].filter(Boolean).join(" · ")}</div>
          {j.salary && <div style={{ marginTop: 4 }}>💰 {j.salary}</div>}
          {j.description && <p style={{ whiteSpace: "pre-wrap", margin: "8px 0" }}>{j.description.length > 220 ? j.description.slice(0, 220) + "…" : j.description}</p>}
          {listItems(j.skills).length > 0 && <div>{listItems(j.skills).map((x) => <span className="pill" key={x}>{x}</span>)}</div>}
          <a className="btn" style={{ marginTop: 8 }} href={`/${handle}/apply/${j.id}`}>Apply →</a>
        </div>
      ))}
    </>
  );
  const hack = inModes("HACKATHON", "ALL");
  const modeProjects = p.projects.filter((x) => mode === "ALL" || x.modes.split(",").includes(mode));
  const projectsP = <>{modeProjects.map((x) => <ProjectCard key={x.id} p={x} origin={origin} />)}</>;
  const eventsP = (
    <>
      {p.events.map((e) => (
        <a key={e.id} href={`/e/${e.slug}`} className="menu-row">
          <span className="menu-ico">🏆</span>
          <span style={{ flex: 1, minWidth: 0 }}><b>{e.name}</b><span className="muted" style={{ display: "block" }}>{[e.startsAt?.toLocaleDateString("en-IN", { dateStyle: "medium" }), e.location].filter(Boolean).join(" · ") || "Details soon"}</span></span>
          <span className={"pill" + (e.open ? " on" : "")} style={{ margin: 0 }}>{e.open ? "Open" : "Closed"}</span>
        </a>
      ))}
    </>
  );
  const bookP = booking && (
    <div className="card"><h3>{booking.icon} {cfg.ctaLabel}</h3>
      <p className="muted" style={{ marginTop: 0 }}>Booking with {p.name} via {booking.provider}.</p>
      {booking.embed && <iframe src={booking.embed} title={`Book with ${p.name}`} loading="lazy" allow="payment" style={{ width: "100%", height: 560, border: "1px solid #e3e6ec", borderRadius: 12, background: "#fff" }} />}
      <a className="btn ghost" style={{ marginTop: 8 }} href={cfg.bookingUrl} target="_blank" rel="noopener noreferrer">Open the booking page ↗</a>
    </div>
  );
  const connectP = (
    <>
      {hasContact && (
        <div className="card"><h3>Contact</h3>
          {p.company && <div>🏢 {p.company}</div>}
          {p.phone && <div>📞 <a href={`tel:${p.phone.replace(/\s+/g, "")}`}>{p.phone}</a></div>}
          {p.email && <div>✉ <a href={`mailto:${p.email}`}>{p.email}</a></div>}
          {p.website && <div>🌐 <a href={p.website} target="_blank">{p.website.replace(/^https?:\/\//, "")}</a></div>}
          {Object.keys(socials).length > 0 && (
            <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10 }}>
              {SOCIALS.filter((x) => socials[x.key]).map((x) => (
                <a key={x.key} href={socials[x.key]} target="_blank" rel="noopener noreferrer" aria-label={x.label} title={x.label}><SocialBadge k={x.key} size={44} /></a>
              ))}
            </div>
          )}
        </div>
      )}
      <form action={exchange} className="card">
        <h3>Share your details back</h3>
        <input type="hidden" name="handle" value={handle} /><input type="hidden" name="mode" value={mode} />
        <div className="row"><input name="firstName" placeholder="First name" required /><input name="lastName" placeholder="Last name" required /></div>
        <input name="email" type="email" placeholder="Email" required />
        <input name="company" placeholder="Company" />
        <input name="linkedin" placeholder="Your LinkedIn (optional)" />
        <button>Send</button>
        <p className="muted">By sending, you agree {p.name} may contact you.</p>
      </form>
    </>
  );

  // Only the pages that have something to show, in a sensible order.
  // Hire me mode: one profile-style page (banner, photo, About, Experience, Education, Skills), nothing else.
  if (mode === "HIRE") {
    const initials = (t: string) => t.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
    const resumes = p.resources.filter((r) => r.kind === "RESUME");
    const portfolios = p.resources.filter((r) => r.kind === "PORTFOLIO");
    const openToWork = openTo.startsWith("Open to");
    const firstResume = resumes.find((r) => !r.gated);
    const contactHref = p.email ? `mailto:${p.email}` : p.phone ? `tel:${p.phone.replace(/\s+/g, "")}` : "";
    const li = (title: string, body: React.ReactNode) => (<div className="li"><h3>{title}</h3>{body}</div>);
    const entry = (c: (typeof p.career)[number]) => (
      <div key={c.id} style={{ display: "flex", gap: 12, marginBottom: 14 }}>
        <div style={{ width: 46, height: 46, borderRadius: 6, background: "#eef1ff", color: "#3b5bdb", display: "grid", placeItems: "center", fontWeight: 700, flexShrink: 0 }}>{initials(c.org) || "•"}</div>
        <div style={{ minWidth: 0 }}>
          <b>{c.title}</b>
          <div>{c.org}{c.location ? ` · ${c.location}` : ""}</div>
          {fmtRange(c.start, c.end) && <div className="muted">{fmtRange(c.start, c.end)}</div>}
          {c.description && <div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{c.description}</div>}
        </div>
      </div>
    );
    return (
      <div className="screen li-page">
        <div className="li" style={{ padding: 0 }}>
          <div style={{ height: 120, background: gradient(p.theme), position: "relative" }}>{p.logo && <img className="brand-logo" src={`/logo/${p.handle}?v=${encodeURIComponent(p.logo)}`} alt={p.company ? `${p.company} logo` : ""} />}</div>
          <div style={{ padding: "0 16px 16px" }}>
            <div style={{ marginTop: -52, marginBottom: 8, display: "inline-block", borderRadius: "50%", padding: 4, background: openToWork ? "#0ca678" : "#fff" }}>
              <div style={{ borderRadius: "50%", background: "#fff", padding: 3 }}>
                <Avatar name={p.name} handle={p.handle} hasPhoto={!!p.photo} avatar={p.avatar} size={96} flip />
              </div>
            </div>
            <h1 style={{ margin: 0, fontSize: 24 }}>{p.name}</h1>
            <div style={{ fontSize: 16 }}>{p.headline || byline(p.headline, p.company)}</div>
            <div className="muted">{[p.company, p.website && p.website.replace(/^https?:\/\//, "")].filter(Boolean).join(" · ")}</div>
            {cfg.intro && <div className="muted" style={{ marginTop: 6 }}>👋 {cfg.intro}</div>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              {contactHref && <a className="btn" style={{ width: "auto", padding: "8px 18px", borderRadius: 99 }} href={contactHref}>{cfg.ctaLabel || "Contact me"}</a>}
              {socials.linkedin && <a className="btn ghost" style={{ width: "auto", padding: "8px 16px", borderRadius: 99 }} href={socials.linkedin} target="_blank" rel="noopener noreferrer">in Connect</a>}
              <a className="btn ghost" style={{ width: "auto", padding: "8px 16px", borderRadius: 99 }} href={`/${handle}/vcard?mode=HIRE`}>Save contact</a>
              {firstResume && <a className="btn ghost" style={{ width: "auto", padding: "8px 16px", borderRadius: 99 }} href={href(firstResume)} target="_blank" rel="noopener noreferrer">📄 Resume</a>}
              {!isOwner && (alreadySaved || sp.saved
                ? <span className="pill" style={{ margin: 0, alignSelf: "center" }}>✓ Saved</span>
                : <form action={saveCard}><input type="hidden" name="handle" value={handle} /><input type="hidden" name="mode" value="HIRE" /><button className="ghost" style={{ width: "auto", padding: "8px 16px", borderRadius: 99 }}>💾 Save card</button></form>)}
            </div>
          </div>
        </div>

        {openTo && (
          <div className="li" style={{ background: openToWork ? "#f0fbf5" : "#fff", borderLeft: `4px solid ${openToWork ? "#0ca678" : "#cfd4dd"}` }}>
            <b>{openToWork ? "🟢 " : "⚪ "}{openTo}</b>
            {skillList.length > 0 && <div className="muted">{skillList.slice(0, 3).join(" · ")}</div>}
          </div>
        )}

        {p.bio && li("About", <div style={{ whiteSpace: "pre-wrap" }}>{p.bio}</div>)}
        {jobs.length > 0 && li("Experience", <>{jobs.map(entry)}</>)}
        {schools.length > 0 && li("Education", <>{schools.map(entry)}</>)}
        {skillList.length > 0 && li("Skills", <div>{skillList.map((x) => <span key={x} className="pill">{x}</span>)}</div>)}
        {modeProjects.length > 0 && li("Projects", <>{modeProjects.map((x) => (
          <div key={x.id} style={{ marginBottom: 10 }}><b>{x.name}</b>{x.tagline && <div>{x.tagline}</div>}{x.demoUrl && <a href={x.demoUrl} target="_blank" rel="noopener noreferrer">Open demo ↗</a>}</div>
        ))}</>)}
        {(resumes.length > 0 || portfolios.length > 0 || portfolioLink) && li("Resume & portfolio", <>
          {resumes.map((r) => r.gated ? locked(r) : viewer(r))}
          {portfolioLink && <a className="btn ghost" style={{ marginBottom: 8 }} href={portfolioLink} target="_blank" rel="noopener noreferrer">🗂️ Open my portfolio ↗</a>}
          {portfolios.map((r) => r.gated ? locked(r) : viewer(r))}
        </>)}
        {hasContact && li("Contact info", <>
          {p.phone && <div>📞 <a href={`tel:${p.phone.replace(/\s+/g, "")}`}>{p.phone}</a></div>}
          {p.email && <div>✉ <a href={`mailto:${p.email}`}>{p.email}</a></div>}
          {p.website && <div>🌐 <a href={p.website} target="_blank" rel="noopener noreferrer">{p.website.replace(/^https?:\/\//, "")}</a></div>}
          {Object.keys(socials).length > 0 && <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 10 }}>{SOCIALS.filter((x) => socials[x.key]).map((x) => (
            <a key={x.key} href={socials[x.key]} target="_blank" rel="noopener noreferrer" aria-label={x.label} title={x.label}><SocialBadge k={x.key} size={40} /></a>
          ))}</div>}
        </>)}
        {li("Get in touch", (
          <form action={exchange}>
            <input type="hidden" name="handle" value={handle} /><input type="hidden" name="mode" value="HIRE" />
            <div className="row"><input name="firstName" placeholder="First name" required /><input name="lastName" placeholder="Last name" required /></div>
            <input name="email" type="email" placeholder="Email" required />
            <input name="company" placeholder="Company" />
            <button>Send my details</button>
            <p className="muted" style={{ marginBottom: 0 }}>By sending, you agree {p.name} may contact you.</p>
          </form>
        ))}
      </div>
    );
  }

  const pages: { key: string; label: string; node: React.ReactNode }[] = [{ key: "me", label: "Me", node: meP }];
  if (mode === "RECRUITER" && p.jobs.length > 0) pages.push({ key: "roles", label: `Open roles (${p.jobs.length})`, node: rolesP });
  if (kitText || fieldDefs.length > 0 || group("DECK").length > 0) pages.push({ key: "product", label: MODE_INFO[mode as Mode].pane, node: productP });
  if (group("DEMO").length > 0) pages.push({ key: "demo", label: "Demo", node: demoP });
  if (modeProjects.length > 0) pages.push({ key: "projects", label: "Projects", node: projectsP });
  if (hack && p.events.length > 0) pages.push({ key: "events", label: "Events", node: eventsP });
  if (hasHire) pages.push({ key: "hire", label: "Hire me", node: hireP });
  if (showTeam) pages.push({ key: "team", label: "Team", node: teamP });
  if (hasDocs) pages.push({ key: "docs", label: "Docs", node: docsP });
  if (booking?.embed) pages.push({ key: "book", label: "Book", node: bookP });
  pages.push({ key: "connect", label: "Connect", node: connectP });
  const start = Math.max(0, pages.findIndex((x) => x.key === sp.pane));

  return (
    <Swiper labels={pages.map((x) => x.label)} initial={start}>
      {pages.map((x) => <div key={x.key}>{x.node}</div>)}
    </Swiper>
  );
}
