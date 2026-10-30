"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32);
const date = (v: FormDataEntryValue | null) => { const d = v ? new Date(String(v)) : null; return d && !isNaN(d.getTime()) ? d : null; };
const url = (v: FormDataEntryValue | null) => { const s = String(v ?? "").trim(); return s && !/^https?:\/\//i.test(s) ? "https://" + s : s; };
const done = () => revalidatePath("/app", "layout");

export async function addOwnProject(fd: FormData) {
  const { profile } = await requireOwner();
  const name = String(fd.get("name")).trim();
  if (!name) redirect("/app/profile/sections?err=name");
  const demoUrl = url(fd.get("demoUrl"));
  await db.project.create({
    data: { profileId: profile.id, name, tagline: String(fd.get("tagline")).trim(), description: String(fd.get("description")).trim(), demoUrl, repoUrl: url(fd.get("repoUrl")), team: String(fd.get("team")).trim() },
  });
  done();
  redirect("/app/profile/sections?saved=1");
}

export async function deleteProject(fd: FormData) {
  const { profile } = await requireOwner();
  await db.project.deleteMany({ where: { id: String(fd.get("id")), profileId: profile.id } });
  done();
}
