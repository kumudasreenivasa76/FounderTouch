"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { unlink } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { EMPLOYMENT, STATUSES, WORK_TYPES } from "@/lib/hiring";

const done = () => revalidatePath("/app", "layout");

export async function createJob(fd: FormData) {
  const { profile } = await requireOwner();
  const title = String(fd.get("title")).trim();
  if (!title) redirect("/app/profile/jobs?err=title");
  const employment = String(fd.get("employment"));
  const workType = String(fd.get("workType"));
  const evId = String(fd.get("eventId") ?? "");
  const ev = evId ? await db.event.findFirst({ where: { id: evId, profileId: profile.id } }) : null;
  await db.job.create({
    data: {
      profileId: profile.id, title: title.slice(0, 120), location: String(fd.get("location") ?? "").trim().slice(0, 100),
      workType: (WORK_TYPES as readonly string[]).includes(workType) ? workType : "", employment: (EMPLOYMENT as readonly string[]).includes(employment) ? employment : "Full-time",
      eventId: ev?.id ?? null, salary: String(fd.get("salary") ?? "").trim().slice(0, 80), description: String(fd.get("description") ?? "").trim().slice(0, 4000), skills: String(fd.get("skills") ?? "").trim().slice(0, 400),
    },
  });
  done();
  redirect("/app/profile/jobs?saved=1");
}

export async function setJobEvent(fd: FormData) {
  const { profile } = await requireOwner();
  const evId = String(fd.get("eventId") ?? "");
  const ev = evId ? await db.event.findFirst({ where: { id: evId, profileId: profile.id } }) : null;
  await db.job.updateMany({ where: { id: String(fd.get("id")), profileId: profile.id }, data: { eventId: ev?.id ?? null } });
  done();
  redirect(`/app/profile/jobs/${String(fd.get("id"))}?saved=1`);
}

export async function toggleJob(fd: FormData) {
  const { profile } = await requireOwner();
  const j = await db.job.findFirst({ where: { id: String(fd.get("id")), profileId: profile.id } });
  if (j) await db.job.update({ where: { id: j.id }, data: { open: !j.open } });
  done();
}

export async function deleteJob(fd: FormData) {
  const { profile } = await requireOwner();
  const j = await db.job.findFirst({ where: { id: String(fd.get("id")), profileId: profile.id }, include: { applications: true } });
  if (!j) return;
  for (const a of j.applications) if (a.resumeFile) await unlink(path.join(process.cwd(), "uploads", path.basename(a.resumeFile))).catch(() => {});
  await db.job.delete({ where: { id: j.id } });
  done();
}

export async function setApplicantStatus(fd: FormData) {
  const { profile } = await requireOwner();
  const status = String(fd.get("status"));
  if (!STATUSES.some((s) => s.key === status)) return;
  await db.application.updateMany({ where: { id: String(fd.get("id")), profileId: profile.id }, data: { status } });
  done();
}

export async function deleteApplicant(fd: FormData) {
  const { profile } = await requireOwner();
  const a = await db.application.findFirst({ where: { id: String(fd.get("id")), profileId: profile.id } });
  if (!a) return;
  if (a.resumeFile) await unlink(path.join(process.cwd(), "uploads", path.basename(a.resumeFile))).catch(() => {});
  await db.application.delete({ where: { id: a.id } });
  done();
}
