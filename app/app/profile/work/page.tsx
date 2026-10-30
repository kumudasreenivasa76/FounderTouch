import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { MODES, MODE_INFO, Mode } from "@/lib/modes";
import { OPEN_TO, byStartDesc, fmtRange } from "@/lib/career";
import PageHead from "@/components/page-head";
import { addResource, delResource } from "../actions";
import { addCareer, delCareer, saveHire } from "../hire-actions";
export const dynamic = "force-dynamic";

const ERR: Record<string, string> = {
  url: "Links must start with http:// or https://",
  size: "File is over 25 MB. Upload it to Google Drive and paste the link instead.",
  empty: "Add a link or choose a file.",
  exp: "Add a job title and a company.",
  edu: "Add a degree or course and a school.",
};
const FILES = [
  { kind: "RESUME", title: "Resume / CV", icon: "📄", hint: "Upload a PDF, or paste a Google Drive link. It shows right on your page.", ph: "Link to your resume (Google Drive, Notion, your site…)", eg: "My resume" },
  { kind: "PORTFOLIO", title: "Portfolio", icon: "🗂️", hint: "Paste a link to your work (Behance, Dribbble, GitHub, your site) or upload a PDF.", ph: "Link to your portfolio (Behance, Dribbble, your site…)", eg: "Design portfolio" },
] as const;

export default async function Hire({ searchParams }: { searchParams: Promise<{ err?: string; saved?: string }> }) {
  const sp = await searchParams;
  const { profile } = await requireOwner();
  const [files, career] = await Promise.all([
    db.resource.findMany({ where: { profileId: profile.id, kind: { in: ["RESUME", "PORTFOLIO"] } }, orderBy: { createdAt: "asc" } }),
    db.careerItem.findMany({ where: { profileId: profile.id } }),
  ]);
  const jobs = career.filter((c) => c.type === "EXPERIENCE").sort(byStartDesc);
  const schools = career.filter((c) => c.type === "EDUCATION").sort(byStartDesc);
  const shownOn = new Set(profile.hireModes.split(",").filter(Boolean));

  const careerForm = (type: "EXPERIENCE" | "EDUCATION") => {
    const edu = type === "EDUCATION";
    return (
      <form action={addCareer} className="card">
        <input type="hidden" name="type" value={type} />
        <h3>{edu ? "Add education" : "Add experience"}</h3>
        <input name="title" placeholder={edu ? "Degree or course (e.g. B.Tech, Computer Science)" : "Job title (e.g. Product Designer)"} required />
        <input name="org" placeholder={edu ? "School or college" : "Company"} required />
        {!edu && <input name="location" placeholder="Location (optional)" />}
        <div className="row">
          <div><label className="f">{edu ? "Start year" : "Start"}</label><input name="start" type={edu ? "number" : "month"} {...(edu ? { min: 1950, max: 2100, placeholder: "2018" } : {})} /></div>
          <div><label className="f">{edu ? "End year" : "End"}</label><input name="end" type={edu ? "number" : "month"} {...(edu ? { min: 1950, max: 2100, placeholder: "2022" } : {})} /></div>
        </div>
        <label style={{ display: "block", margin: "0 0 8px" }}><input type="checkbox" name="current" />{edu ? "Still studying" : "I work here now"}</label>
        <textarea name="description" rows={3} placeholder={edu ? "Grade, honours, activities (optional)" : "What you did and achieved (optional)"} />
        <button className="ghost">{edu ? "Add education" : "Add experience"}</button>
      </form>
    );
  };

  return (
    <>
      <PageHead title="Hire me" sub="Your career in one place: openness to work, skills, experience, education, resume and portfolio." saved={!!sp.saved} error={sp.err ? ERR[sp.err] ?? "Something went wrong." : undefined} />

      <form action={saveHire} className="card">
        <h3>Status &amp; skills</h3>
        <label className="f">I am</label>
        <select name="openTo" defaultValue={profile.openTo}>
          <option value="">Not shown</option>
          {OPEN_TO.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <label className="f">Skills</label>
        <textarea name="skills" rows={2} defaultValue={profile.skills} placeholder="e.g. Figma, React, Product strategy (comma separated)" />
        <label className="f">Show these details on</label>
        <div className="chips">
          {MODES.filter((m) => m !== "ALL").map((m) => (
            <label key={m} className="pill" style={{ cursor: "pointer" }}><input type="checkbox" name="modes" value={m} defaultChecked={shownOn.has(m)} />{MODE_INFO[m].icon} {MODE_INFO[m].label}</label>
          ))}
        </div>
        <p className="muted" style={{ margin: "0 0 8px" }}>The "All" page always shows them.</p>
        <button>Save</button>
      </form>

      <h2>💼 Experience ({jobs.length})</h2>
      {jobs.length === 0 && <div className="card muted">No experience added yet.</div>}
      {jobs.map((c) => (
        <div className="card" key={c.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b>{c.title}</b>
            <div>{c.org}{c.location ? ` · ${c.location}` : ""}</div>
            <div className="muted">{fmtRange(c.start, c.end)}</div>
            {c.description && <div className="muted" style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{c.description}</div>}
          </div>
          <form action={delCareer}><input type="hidden" name="id" value={c.id} /><button className="ghost sm">Remove</button></form>
        </div>
      ))}
      {careerForm("EXPERIENCE")}

      <h2>🎓 Education ({schools.length})</h2>
      {schools.length === 0 && <div className="card muted">No education added yet.</div>}
      {schools.map((c) => (
        <div className="card" key={c.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b>{c.title}</b>
            <div>{c.org}</div>
            <div className="muted">{fmtRange(c.start, c.end)}</div>
            {c.description && <div className="muted" style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{c.description}</div>}
          </div>
          <form action={delCareer}><input type="hidden" name="id" value={c.id} /><button className="ghost sm">Remove</button></form>
        </div>
      ))}
      {careerForm("EDUCATION")}

      {FILES.map((s) => {
        const mine = files.filter((r) => r.kind === s.kind);
        return (
          <div key={s.kind}>
            <h2>{s.icon} {s.title} ({mine.length})</h2>
            {mine.map((r) => (
              <div className="card" key={r.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b>{r.title}</b>
                  <div className="muted">{r.filePath ? "Uploaded file" : new URL(r.url).hostname}</div>
                  <div className="muted">Shown on: {r.modes.split(",").filter(Boolean).map((m) => MODE_INFO[m as Mode]?.label).filter(Boolean).join(", ") || "no page"}</div>
                </div>
                <form action={delResource}><input type="hidden" name="id" value={r.id} /><button className="ghost sm">Remove</button></form>
              </div>
            ))}
            <form action={addResource} className="card">
              <input type="hidden" name="ret" value="work" /><input type="hidden" name="kind" value={s.kind} /><input type="hidden" name="kmode" value="FOUNDER" />
              <h3>Add {s.title.toLowerCase()}</h3>
              <p className="muted" style={{ marginTop: 0 }}>{s.hint}</p>
              <input name="title" placeholder={`Title (e.g. ${s.eg})`} />
              <input name="url" placeholder={s.ph} inputMode="url" autoCapitalize="none" />
              <label className="f">Or upload a file (PDF, DOC; up to 25 MB)</label>
              <input name="file" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg" />
              <label className="f">Show on these pages</label>
              <div className="chips">
                {MODES.filter((m) => m !== "ALL").map((m) => (
                  <label key={m} className="pill" style={{ cursor: "pointer" }}><input type="checkbox" name="modes" value={m} defaultChecked />{MODE_INFO[m].icon} {MODE_INFO[m].label}</label>
                ))}
              </div>
              <label style={{ display: "block", margin: "4px 0 10px" }}><input type="checkbox" name="gated" />🔒 Require my approval before people can open it</label>
              <button>Add {s.title.toLowerCase()}</button>
            </form>
          </div>
        );
      })}
    </>
  );
}
