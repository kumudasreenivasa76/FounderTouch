import { headers } from "next/headers";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { MODES, MODE_INFO, Mode } from "@/lib/modes";
import PageHead from "@/components/page-head";
import ProjectCard from "@/components/project-card";
import { addOwnProject, deleteProject, setProjectModes } from "../event-actions";
export const dynamic = "force-dynamic";

const PAGES = MODES.filter((m) => m !== "ALL");

/** Things you have built. Pick which modes show each one, like LinkedIn's Projects section. */
export default async function Projects({ searchParams }: { searchParams: Promise<{ err?: string; saved?: string }> }) {
  const sp = await searchParams;
  const { profile } = await requireOwner();
  const projects = await db.project.findMany({ where: { profileId: profile.id, eventId: null }, orderBy: { createdAt: "desc" } });
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  return (
    <>
      <PageHead title="Projects" sub="Show what you have built, with a link to try it. Each project appears on the modes you choose, such as Hire me, Hackathon or Founder." saved={!!sp.saved} error={sp.err ? "Give the project a name." : undefined} />

      {projects.length === 0 && <div className="card muted">No projects yet. Add your first one below.</div>}
      {projects.map((p) => (
        <div key={p.id}>
          <ProjectCard p={p} origin={origin} />
          <form action={setProjectModes} className="card" style={{ marginTop: -6 }}>
            <input type="hidden" name="id" value={p.id} />
            <div className="muted" style={{ marginBottom: 4 }}>Shown on</div>
            <div className="chips">
              {PAGES.map((m) => (
                <label key={m} className="pill" style={{ cursor: "pointer" }}><input type="checkbox" name="modes" value={m} defaultChecked={p.modes.split(",").includes(m)} />{MODE_INFO[m as Mode].icon} {MODE_INFO[m as Mode].label}</label>
              ))}
            </div>
            <div className="row" style={{ marginTop: 4 }}>
              <button className="ghost">Save</button>
            </div>
          </form>
          <form action={deleteProject} style={{ margin: "-4px 0 14px" }}><input type="hidden" name="id" value={p.id} /><button className="ghost sm">Delete project</button></form>
        </div>
      ))}

      <form action={addOwnProject} className="card">
        <h3>Add a project</h3>
        <input name="name" placeholder="Project name" required />
        <input name="tagline" placeholder="One-line summary" />
        <textarea name="description" rows={3} placeholder="What it does, and your part in it" />
        <input name="demoUrl" placeholder="Link to try it (website, YouTube, Loom, Drive…)" inputMode="url" autoCapitalize="none" />
        <input name="repoUrl" placeholder="Code link (GitHub), optional" inputMode="url" autoCapitalize="none" />
        <input name="team" placeholder="Who worked on it (optional)" />
        <label className="f">Show on</label>
        <div className="chips">
          {PAGES.map((m) => (
            <label key={m} className="pill" style={{ cursor: "pointer" }}><input type="checkbox" name="modes" value={m} defaultChecked={m === "HIRE" || m === "HACKATHON"} />{MODE_INFO[m as Mode].icon} {MODE_INFO[m as Mode].label}</label>
          ))}
        </div>
        <button>Add project</button>
      </form>
    </>
  );
}
