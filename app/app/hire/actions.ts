"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { unlink } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { EMPLOYMENT, STATUSES, WORK_TYPES } from "@/lib/hiring";
import { deleteUpload } from "@/lib/storage";

const refresh = () => revalidatePath("/app", "layout");
const safe = (v: FormDataEntryValue | null, fb: string) => { const s = String(v ?? ""); return s.startsWith("/app/hire") ? s : fb; };

async function ownJob(id: FormDataEntryValue | null) {
  const { profile } = await requireOwner();
  const job = await db.job.findFirst({ where: { id: String(id), profileId: profile.id } });
  if (!job) redirect("/app/hire");
  return { profile, job };
}
async function ownApp(id: FormDataEntryValue | null) {
  const { profile } = await requireOwner();
  const a = await db.application.findFirst({ where: { id: String(id), profileId: profile.id } });
  if (!a) redirect("/app/hire");
  return { profile, a };
}

function jobData(fd: FormData) {
  const t = (k: string, n: number) => String(fd.get(k) ?? "").trim().slice(0, n);
  const workType = t("workType", 20), employment = t("employment", 20);
  return {
    title: t("title", 120), location: t("location", 100), salary: t("salary", 80), description: t("description", 4000),
    skills: t("skills", 400).split(/[,\n]+/).map((x) => x.trim()).filter(Boolean).slice(0, 15).join(", "),
    workType: (WORK_TYPES as readonly string[]).includes(workType) ? workType : "",
    employment: (EMPLOYMENT as readonly string[]).includes(employment) ? employment : "Full-time",
  };
}

export async function postJob(fd: FormData) {
  const { profile } = await requireOwner();
  const d = jobData(fd);
  if (!d.title) redirect("/app/hire/new?err=title");
  const evId = String(fd.get("eventId") ?? "");
  const ev = evId ? await db.event.findFirst({ where: { id: evId, profileId: profile.id } }) : null;
  const job = await db.job.create({ data: { ...d, profileId: profile.id, eventId: ev?.id ?? null } });
  refresh();
  redirect(`/app/hire/${job.id}?saved=1`);
}

export async function saveJob(fd: FormData) {
  const { job } = await ownJob(fd.get("id"));
  const d = jobData(fd);
  if (!d.title) redirect(`/app/hire/${job.id}?err=title`);
  const evId = String(fd.get("eventId") ?? "");
  const ev = evId ? await db.event.findFirst({ where: { id: evId, profileId: job.profileId } }) : null;
  await db.job.update({ where: { id: job.id }, data: { ...d, eventId: ev?.id ?? null } });
  refresh();
  redirect(`/app/hire/${job.id}?saved=1`);
}

export async function setJobOpen(fd: FormData) {
  const { job } = await ownJob(fd.get("id"));
  await db.job.update({ where: { id: job.id }, data: { open: fd.get("open") === "1" } });
  refresh();
  redirect(`/app/hire/${job.id}`);
}

export async function removeJob(fd: FormData) {
  const { job } = await ownJob(fd.get("id"));
  const apps = await db.application.findMany({ where: { jobId: job.id } });
  for (const a of apps) if (a.resumeFile) await deleteUpload(a.resumeFile).catch(() => {});
  await db.job.delete({ where: { id: job.id } });
  refresh();
  redirect("/app/hire");
}

/** Move a candidate to another stage. Offers and hires keep their place; rejected people stay on record. */
export async function moveCandidate(fd: FormData) {
  const { a } = await ownApp(fd.get("id"));
  const status = String(fd.get("status"));
  if (!STATUSES.some((s) => s.key === status)) redirect("/app/hire");
  await db.application.update({ where: { id: a.id }, data: { status } });
  refresh();
  redirect(safe(fd.get("back"), `/app/hire/${a.jobId}`));
}

export async function rateCandidate(fd: FormData) {
  const { a } = await ownApp(fd.get("id"));
  const n = Math.max(0, Math.min(5, parseInt(String(fd.get("rating")), 10) || 0));
  await db.application.update({ where: { id: a.id }, data: { rating: a.rating === n ? 0 : n } });
  refresh();
  redirect(`/app/hire/candidate/${a.id}`);
}

export async function saveCandidateNotes(fd: FormData) {
  const { a } = await ownApp(fd.get("id"));
  await db.application.update({ where: { id: a.id }, data: { notes: String(fd.get("notes") ?? "").trim().slice(0, 2000) } });
  refresh();
  redirect(`/app/hire/candidate/${a.id}?saved=1`);
}

/** Set the interview time. Moves a new or shortlisted candidate to the Interview stage. */
export async function scheduleInterview(fd: FormData) {
  const { a } = await ownApp(fd.get("id"));
  const raw = String(fd.get("when") ?? "");
  const when = raw ? new Date(raw) : null;
  const ok = when && !isNaN(when.getTime());
  await db.application.update({ where: { id: a.id }, data: { interviewAt: ok ? when : null, ...(ok && (a.status === "NEW" || a.status === "SHORTLISTED") ? { status: "INTERVIEW" } : {}) } });
  refresh();
  redirect(`/app/hire/candidate/${a.id}?saved=1`);
}

/** Invite someone with a Hire me profile to apply for one of your roles. */
export async function inviteTalent(fd: FormData) {
  const { profile, job } = await ownJob(fd.get("jobId"));
  const cand = await db.profile.findUnique({ where: { id: String(fd.get("profileId")) } });
  if (cand && cand.id !== profile.id) await db.invite.upsert({ where: { jobId_candidateProfileId: { jobId: job.id, candidateProfileId: cand.id } }, update: {}, create: { jobId: job.id, recruiterProfileId: profile.id, candidateProfileId: cand.id } });
  refresh();
  redirect(safe(fd.get("back"), "/app/hire/talent"));
}
