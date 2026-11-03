"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { redeemOne } from "@/lib/vouchers";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { eventAccess, STAFF_ROLES } from "@/lib/event-access";

const done = () => revalidatePath("/app", "layout");
async function own(id: FormDataEntryValue | null) {
  const { profile } = await requireOwner();
  const event = await db.event.findFirst({ where: { id: String(id), profileId: profile.id } });
  if (!event) redirect("/app/events");
  return event;
}
const tokenOf = (s: string) => s.trim().split(/[/?#]/).filter(Boolean).pop() ?? "";

/* ---------- external links (Devpost, Discord…) ---------- */
export async function addLink(fd: FormData) {
  const e = await own(fd.get("eventId"));
  const url = String(fd.get("url") ?? "").trim();
  const label = String(fd.get("label") ?? "").trim().slice(0, 60);
  if (!label || !/^https:\/\//i.test(url)) redirect(`/app/events/${e.id}?err=link`);
  const order = await db.eventLink.count({ where: { eventId: e.id } });
  await db.eventLink.create({ data: { eventId: e.id, label, url: url.slice(0, 500), purpose: String(fd.get("purpose") ?? "other").slice(0, 20), order } });
  done();
}
export async function removeLink(fd: FormData) {
  const e = await own(fd.get("eventId"));
  await db.eventLink.deleteMany({ where: { id: String(fd.get("id")), eventId: e.id } });
  done();
}

/* ---------- staff roles ---------- */
export async function addStaff(fd: FormData) {
  const e = await own(fd.get("eventId"));
  const role = String(fd.get("role"));
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(STAFF_ROLES as readonly string[]).includes(role)) redirect(`/app/events/${e.id}?err=staff`);
  const scope = String(fd.get("scope") ?? "");
  await db.eventStaff.upsert({
    where: { eventId_userId_role: { eventId: e.id, userId: user.id, role } },
    update: { scope }, create: { eventId: e.id, userId: user.id, role, scope },
  });
  done();
}
export async function removeStaff(fd: FormData) {
  const e = await own(fd.get("eventId"));
  await db.eventStaff.deleteMany({ where: { id: String(fd.get("id")), eventId: e.id } });
  done();
}

/* ---------- meal vouchers ---------- */
export async function addPlan(fd: FormData) {
  const e = await own(fd.get("eventId"));
  const name = String(fd.get("name") ?? "").trim().slice(0, 40);
  if (!name) return;
  const per = Math.max(1, Math.min(10, parseInt(String(fd.get("perPerson") ?? "1"), 10) || 1));
  await db.voucherPlan.create({ data: { eventId: e.id, name, perPerson: per } });
  done();
}
export async function removePlan(fd: FormData) {
  const e = await own(fd.get("eventId"));
  await db.voucherPlan.deleteMany({ where: { id: String(fd.get("id")), eventId: e.id } });
  done();
}

export type RedeemResult = { status: "ok" | "already" | "unknown" | "denied"; name?: string; left?: number };

/**
 * A vendor or the organizer scans an attendee ticket for one meal. Vouchers are created on demand up to the plan quota,
 * then flipped ISSUED -> REDEEMED with a conditional update, so two simultaneous scans cannot both succeed.
 * Redemption is independent of check-in.
 */
export async function redeemVoucher(eventId: string, planId: string, code: string, key: string): Promise<RedeemResult> {
  const acc = await eventAccess(eventId);
  if (!acc) return { status: "denied" };
  const plan = await db.voucherPlan.findFirst({ where: { id: planId, eventId } });
  if (!plan) return { status: "unknown" };
  const allowed = acc.owner || (acc.isVendor && acc.vendorScopes.some((s) => s === "" || s === plan.id));
  if (!allowed) return { status: "denied" };
  const now = new Date();
  if ((plan.validFrom && now < plan.validFrom) || (plan.validTo && now > plan.validTo)) return { status: "denied" };
  const a = await db.attendee.findUnique({ where: { token: tokenOf(code) } });
  if (!a || a.eventId !== eventId) return { status: "unknown" };
  if (a.status !== "CONFIRMED") return { status: "denied", name: a.name };
  if (key) {
    const dup = await db.eventScan.findFirst({ where: { eventId, idempotencyKey: key } });
    if (dup) return { status: dup.result === "ok" ? "ok" : "already", name: a.name };
  }
  const { won, left } = await redeemOne(planId, a.id, acc.user.id, now);
  await db.eventScan.create({ data: { eventId, actorId: acc.user.id, subjectId: a.id, scanType: "VOUCHER", result: won ? "ok" : "already", idempotencyKey: key } });
  return { status: won ? "ok" : "already", name: a.name, left };
}

/**
 * A recruiter at the event records a conversation with an attendee. Only attendees who opted in to recruiter contact
 * can be recorded. The job and any application stay in Hire: this just points at an existing job and never applies for anyone.
 */
export async function recordEncounter(fd: FormData) {
  const eventId = String(fd.get("eventId"));
  const back = `/app/events/${eventId}/recruit`;
  const acc = await eventAccess(eventId);
  if (!acc || !(acc.owner || acc.isRecruiter)) redirect("/app");
  const a = await db.attendee.findUnique({ where: { token: tokenOf(String(fd.get("code") ?? "")) } });
  if (!a || a.eventId !== eventId || a.status !== "CONFIRMED") redirect(`${back}?err=unknown`);
  if (!a.consentRecruiter) redirect(`${back}?err=consent`);
  const jobId = String(fd.get("jobId") ?? "");
  const job = jobId ? await db.job.findFirst({ where: { id: jobId, eventId } }) : null;
  const data = { jobId: job?.id ?? "", notes: String(fd.get("notes") ?? "").trim().slice(0, 500), consent: true };
  await db.recruiterEncounter.upsert({
    where: { eventId_recruiterId_attendeeId: { eventId, recruiterId: acc.user.id, attendeeId: a.id } },
    update: data, create: { eventId, recruiterId: acc.user.id, attendeeId: a.id, ...data },
  });
  revalidatePath(back);
  redirect(`${back}?saved=1`);
}
