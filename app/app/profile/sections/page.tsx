import { headers } from "next/headers";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { MODES, MODE_INFO, Mode } from "@/lib/modes";
import PageHead from "@/components/page-head";
import QuerySelect from "@/components/query-select";
import ProjectCard from "@/components/project-card";
import { addSection, delSection, saveModeSections } from "../actions";
import { addOwnProject, deleteProject } from "../event-actions";
export const dynamic = "force-dynamic";

export default async function SectionsAndProjects({ searchParams }: { searchParams: Promise<{ saved?: string; mode?: string; err?: string }> }) {
  const sp = await searchParams;
  const { profile } = await requireOwner();
  const mode = ((MODES as readonly string[]).includes(sp.mode ?? "") ? sp.mode! : "ALL") as Mode;
  const [sections, cfg, projects] = await Promise.all([
    db.section.findMany({ where: { profileId: profile.id }, orderBy: { order: "asc" } }),
    db.modeConfig.findFirst({ where: { profileId: profile.id, mode } }),
    db.project.findMany({ where: { profileId: profile.id, eventId: null }, orderBy: { createdAt: "desc" } }),
  ]);
  const shown = new Set<string>(JSON.parse(cfg?.sectionIds ?? "[]"));
  const info = MODE_INFO[mode];
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  return (
    <>
      <PageHead title="Sections & projects" sub="Text sections and projects with demos. Pick a mode to choose which sections it shows." saved={!!sp.saved} error={sp.err ? "Give the project a name." : undefined} />

      <h2 style={{ marginTop: 4 }}>🧩 Sections</h2>
      <QuerySelect label="Choose a mode" current={mode} options={MODES.map((m) => ({ value: m, label: `${MODE_INFO[m].icon} ${MODE_INFO[m].label}` }))} />

      <form action={saveModeSections} className="card" style={{ marginTop: 12 }} key={mode}>
        <input type="hidden" name="mode" value={mode} />
        <h3>Shown on {info.icon} {info.label}</h3>
        {sections.length === 0 && <p className="muted" style={{ margin: 0 }}>No sections yet. Add one below.</p>}
        {sections.map((s) => (
          <label key={s.id} style={{ display: "block", margin: "6px 0" }}><input type="checkbox" name="sec" value={s.id} defaultChecked={shown.has(s.id)} />{s.title}</label>
        ))}
        {sections.length > 0 && <button style={{ marginTop: 8 }}>Save for {info.label}</button>}
      </form>

      {sections.map((s) => (
        <div className="card" key={s.id}>
          <b>{s.title}</b><div className="muted" style={{ whiteSpace: "pre-wrap" }}>{s.body}</div>
          <form action={delSection} style={{ marginTop: 8 }}><input type="hidden" name="id" value={s.id} /><button className="ghost sm">Delete</button></form>
        </div>
      ))}
      <form action={addSection} className="card">
        <h3>Add a section</h3>
        <input name="title" placeholder="Title (e.g. Traction)" required />
        <textarea name="body" rows={3} placeholder="Content" required />
        <button>Add section</button>
      </form>

      <h2>💡 Projects ({projects.length})</h2>
      <p className="muted" style={{ marginTop: 0 }}>Hackathon and side projects with a demo. They show on your Hackathon and All pages.</p>
      {projects.length === 0 && <div className="card muted">No projects yet.</div>}
      {projects.map((p) => (
        <ProjectCard key={p.id} p={p} origin={origin}
          action={<form action={deleteProject} style={{ marginTop: 8 }}><input type="hidden" name="id" value={p.id} /><button className="ghost sm">Remove</button></form>} />
      ))}
      <form action={addOwnProject} className="card">
        <h3>Add a project</h3>
        <input name="name" placeholder="Project name" required />
        <input name="tagline" placeholder="One-line pitch" />
        <textarea name="description" rows={3} placeholder="What it does and how you built it" />
        <input name="demoUrl" placeholder="Demo link (YouTube, Loom, Vimeo, Drive, MP4 or any site)" inputMode="url" autoCapitalize="none" />
        <input name="repoUrl" placeholder="Code link (GitHub)" inputMode="url" autoCapitalize="none" />
        <input name="team" placeholder="Team (names, comma separated)" />
        <button>Add project</button>
      </form>
    </>
  );
}
