"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { MODES } from "@/lib/modes";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32);
const date = (v: FormDataEntryValue | null) => { const d = v ? new Date(String(v)) : null; return d && !isNaN(d.getTime()) ? d : null; };
const url = (v: FormDataEntryValue | null) => { const s = String(v ?? "").trim(); return s && !/^https?:\/\//i.test(s) ? "https://" + s : s; };
const done = () => revalidatePath("/app", "layout");

export async function addOwnProject(fd: FormData) {
  const { profile } = await requireOwner();
  const name = String(fd.get("name")).trim();
  if (!name) redirect("/app/profile/projects?err=name");
  const modes = fd.getAll("modes").map(String).filter((m) => (MODES as readonly string[]).includes(m) && m !== "ALL");
  await db.project.create({
    data: {
      profileId: profile.id, name: name.slice(0, 80), tagline: String(fd.get("tagline")).trim().slice(0, 140), description: String(fd.get("description")).trim().slice(0, 1200),
      demoUrl: url(fd.get("demoUrl")), repoUrl: url(fd.get("repoUrl")), team: String(fd.get("team")).trim().slice(0, 200), modes: (modes.length ? modes : ["HIRE"]).join(","),
    },
  });
  done();
  redirect("/app/profile/projects?saved=1");
}

export async function setProjectModes(fd: FormData) {
  const { profile } = await requireOwner();
  const modes = fd.getAll("modes").map(String).filter((m) => (MODES as readonly string[]).includes(m) && m !== "ALL");
  await db.project.updateMany({ where: { id: String(fd.get("id")), profileId: profile.id, eventId: null }, data: { modes: modes.join(",") } });
  done();
  redirect("/app/profile/projects?saved=1");
}

export async function deleteProject(fd: FormData) {
  const { profile } = await requireOwner();
  await db.project.deleteMany({ where: { id: String(fd.get("id")), profileId: profile.id } });
  done();
}
