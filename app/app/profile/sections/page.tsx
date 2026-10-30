import Link from "next/link";
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

/** Two plain things in one place: short text blocks for your page, and projects with a demo. */
export default async function TextAndProjects({ searchParams }: { searchParams: Promise<{ saved?: string; mode?: string; tab?: string; err?: string }> }) {
  const sp = await searchParams;
  const { profile } = await requireOwner();
  const tab = sp.tab === "projects" ? "projects" : "blocks";
  const mode = ((MODES as readonly string[]).includes(sp.mode ?? "") ? sp.mode! : "ALL") as Mode;
  const [blocks, cfg, projects] = await Promise.all([
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
      <PageHead title="Text blocks & projects" saved={!!sp.saved} error={sp.err ? "Give the project a name." : undefined} />

      <div className="chips" style={{ marginBottom: 12 }}>
        <Link href="/app/profile/sections" className={"pill" + (tab === "blocks" ? " on" : "")}>📝 Text blocks ({blocks.length})</Link>
        <Link href="/app/profile/sections?tab=projects" className={"pill" + (tab === "projects" ? " on" : "")}>💡 Projects ({projects.length})</Link>
      </div>

      {tab === "blocks" ? (
        <>
          <p className="muted" style={{ marginTop: 0 }}>A text block is a short piece of writing on your page, like Traction or Pricing. Add your blocks, then choose which mode shows each one.</p>

          <form action={addSection} className="card">
            <h3>1. Add a text block</h3>
            <input name="title" placeholder="Title (e.g. Traction)" required />
            <textarea name="body" rows={3} placeholder="What you want to say" required />
            <button>Add block</button>
          </form>

          <h3 style={{ margin: "16px 0 6px" }}>2. Your blocks</h3>
          {blocks.length === 0 && <div className="card muted">No blocks yet. Add one above.</div>}
          {blocks.map((s) => (
            <div className="card" key={s.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}><b>{s.title}</b><div className="muted" style={{ whiteSpace: "pre-wrap" }}>{s.body}</div></div>
              <form action={delSection}><input type="hidden" name="id" value={s.id} /><button className="ghost sm">Delete</button></form>
            </div>
          ))}

          {blocks.length > 0 && (
            <>
              <h3 style={{ margin: "16px 0 6px" }}>3. Choose what each mode shows</h3>
              <QuerySelect label="Choose a mode" current={mode} options={MODES.map((m) => ({ value: m, label: `${MODE_INFO[m].icon} ${MODE_INFO[m].label}` }))} />
              <form action={saveModeSections} className="card" style={{ marginTop: 10 }} key={mode}>
                <input type="hidden" name="mode" value={mode} />
                <div className="muted" style={{ marginBottom: 6 }}>Tick the blocks to show on the {info.label} page.</div>
                {blocks.map((s) => (
                  <label key={s.id} style={{ display: "block", margin: "6px 0" }}><input type="checkbox" name="sec" value={s.id} defaultChecked={shown.has(s.id)} />{s.title}</label>
                ))}
                <button style={{ marginTop: 8 }}>Save for {info.label}</button>
              </form>
            </>
          )}
        </>
      ) : (
        <>
          <p className="muted" style={{ marginTop: 0 }}>Things you have built, with a link to a demo. They show on your Hackathon and All pages.</p>

          {projects.length === 0 && <div className="card muted">No projects yet. Add your first one below.</div>}
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
      )}
    </>
  );
}
