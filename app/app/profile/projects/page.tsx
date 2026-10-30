import { headers } from "next/headers";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import PageHead from "@/components/page-head";
import ProjectCard from "@/components/project-card";
import { addOwnProject, deleteProject } from "../event-actions";
export const dynamic = "force-dynamic";

export default async function Projects({ searchParams }: { searchParams: Promise<{ err?: string; saved?: string }> }) {
  const sp = await searchParams;
  const { profile } = await requireOwner();
  const projects = await db.project.findMany({ where: { profileId: profile.id, eventId: null }, orderBy: { createdAt: "desc" } });
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  return (
    <>
      <PageHead title="My projects" sub="Hackathon and side projects with a demo. They show on your Hackathon and All pages." saved={!!sp.saved} error={sp.err ? "Give the project a name." : undefined} />
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
