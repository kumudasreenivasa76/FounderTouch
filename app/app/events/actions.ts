"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { eventAccess } from "@/lib/event-access";
import { putUpload, deleteUpload } from "@/lib/storage";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32);
const date = (v: FormDataEntryValue | null) => { const d = v ? new Date(String(v)) : null; return d && !isNaN(d.getTime()) ? d : null; };
const hex = (v: FormDataEntryValue | null) => { const s = String(v ?? "").trim(); return /^#[0-9a-f]{6}$/i.test(s) ? s : ""; };
const done = () => revalidatePath("/app", "layout");
const IMG = [".jpg", ".jpeg", ".png", ".webp"];

async function own(id: FormDataEntryValue | null) {
  const { profile } = await requireOwner();
  const event = await db.event.findFirst({ where: { id: String(id), profileId: profile.id } });
  if (!event) redirect("/app/events");
  return { profile, event };
}

export async function createEvent(fd: FormData) {
  const { profile } = await requireOwner();
  const name = String(fd.get("name")).trim();
  if (!name) redirect("/app/events?err=name");
  let slug = `${slugify(name) || "event"}-${randomBytes(2).toString("hex")}`;
  while (await db.event.findUnique({ where: { slug } })) slug = `${slugify(name)}-${randomBytes(3).toString("hex")}`;
  const e = await db.event.create({
    data: { profileId: profile.id, slug, name: name.slice(0, 120), description: String(fd.get("description") ?? "").trim().slice(0, 2000), location: String(fd.get("location") ?? "").trim().slice(0, 160), startsAt: date(fd.get("startsAt")), endsAt: date(fd.get("endsAt")),
      summary: String(fd.get("summary") ?? "").trim().slice(0, 200),
      format: ["IN_PERSON", "ONLINE", "HYBRID"].includes(String(fd.get("format"))) ? String(fd.get("format")) : "IN_PERSON",
      visibility: ["PUBLIC", "UNLISTED", "INVITE"].includes(String(fd.get("visibility"))) ? String(fd.get("visibility")) : "PUBLIC",
      onlineUrl: /^https:\/\//i.test(String(fd.get("onlineUrl") ?? "").trim()) ? String(fd.get("onlineUrl")).trim().slice(0, 500) : "",
      capacity: Math.max(0, Math.min(100000, parseInt(String(fd.get("capacity") ?? "0"), 10) || 0)),
      requireApproval: fd.get("requireApproval") === "on", waitlist: fd.get("waitlist") === "on",
      published: false, // starts as a draft; publish from the event page
    },
  });
  done();
  redirect(`/app/events/${e.id}?saved=1`);
}

export async function updateEvent(fd: FormData) {
  const { event } = await own(fd.get("id"));
  const back = `/app/events/${event.id}`;
  const name = String(fd.get("name")).trim();
  if (!name) redirect(`${back}?err=name`);
  const cap = Math.max(0, Math.min(100000, parseInt(String(fd.get("capacity") ?? "0"), 10) || 0));
  await db.event.update({
    where: { id: event.id },
    data: {
      name: name.slice(0, 120), description: String(fd.get("description") ?? "").trim().slice(0, 2000), agenda: String(fd.get("agenda") ?? "").trim().slice(0, 3000),
      location: String(fd.get("location") ?? "").trim().slice(0, 160), startsAt: date(fd.get("startsAt")), endsAt: date(fd.get("endsAt")), capacity: cap,
      summary: String(fd.get("summary") ?? "").trim().slice(0, 200),
      format: ["IN_PERSON", "ONLINE", "HYBRID"].includes(String(fd.get("format"))) ? String(fd.get("format")) : "IN_PERSON",
      visibility: ["PUBLIC", "UNLISTED", "INVITE"].includes(String(fd.get("visibility"))) ? String(fd.get("visibility")) : "PUBLIC",
      timezone: String(fd.get("timezone") ?? "Asia/Kolkata").trim().slice(0, 40) || "Asia/Kolkata",
      onlineUrl: /^https:\/\//i.test(String(fd.get("onlineUrl") ?? "").trim()) ? String(fd.get("onlineUrl")).trim().slice(0, 500) : "",
      contactEmail: String(fd.get("contactEmail") ?? "").trim().slice(0, 120),
      tags: String(fd.get("tags") ?? "").trim().slice(0, 200),
      regOpensAt: date(fd.get("regOpensAt")), regDeadline: date(fd.get("regDeadline")),
      requireApproval: fd.get("requireApproval") === "on", waitlist: fd.get("waitlist") === "on",
      refundPolicy: String(fd.get("refundPolicy") ?? "").trim().slice(0, 500),
      published: fd.get("published") === "on",
      plusOnes: Math.max(0, Math.min(10, parseInt(String(fd.get("plusOnes") ?? "0"), 10) || 0)),
      questions: JSON.stringify(String(fd.get("questions") ?? "").split("\n").map((q) => q.trim().slice(0, 140)).filter(Boolean).slice(0, 8)),
      modules: JSON.stringify(["vouchers", "hackathon", "recruiting"].filter((m) => fd.get("mod_" + m) === "on")),
    },
  });
  done();
  redirect(`${back}?saved=1`);
}

/** Colours, logo and cover image for the event page and tickets. */
export async function saveBranding(fd: FormData) {
  const { event } = await own(fd.get("id"));
  const back = `/app/events/${event.id}`;
  const data: { color1?: string; color2?: string; logo?: string; cover?: string } = { color1: hex(fd.get("color1")), color2: hex(fd.get("color2")) };
  if (fd.get("resetColors") === "on") { data.color1 = ""; data.color2 = ""; }
  for (const [field, key] of [["logo", "logo"], ["cover", "cover"]] as const) {
    const old = event[key];
    if (fd.get("rm_" + field) === "on") {
      if (old) await deleteUpload(old).catch(() => {});
      data[key] = "";
      continue;
    }
    const f = fd.get(field) as File | null;
    if (f && f.size > 0) {
      const ext = path.extname(f.name).toLowerCase();
      if (!IMG.includes(ext) || f.size > 5 * 1024 * 1024) redirect(`${back}?err=img`);
      const name = `ev-${field}-${randomBytes(8).toString("hex")}${ext}`;
      await putUpload(name, Buffer.from(await f.arrayBuffer()));
      if (old) await deleteUpload(old).catch(() => {});
      data[key] = name;
    }
  }
  await db.event.update({ where: { id: event.id }, data });
  done();
  redirect(`${back}?saved=1`);
}

export async function toggleEvent(fd: FormData) {
  const { event } = await own(fd.get("id"));
  await db.event.update({ where: { id: event.id }, data: { open: !event.open } });
  done();
}

export async function deleteEvent(fd: FormData) {
  const { event } = await own(fd.get("id"));
  for (const f of [event.logo, event.cover]) if (f) await deleteUpload(f).catch(() => {});
  await db.event.delete({ where: { id: event.id } });
  done();
  redirect("/app/events");
}

export async function removeProject(fd: FormData) {
  const { event } = await own(fd.get("eventId"));
  await db.project.deleteMany({ where: { id: String(fd.get("id")), eventId: event.id } });
  done();
}

/* ---------- check-in ---------- */
export type CheckInResult = { status: "ok" | "already" | "unknown" | "error"; name?: string; company?: string; at?: string };

/** Called by the scanner with the text inside a ticket QR (a ticket link or the bare token). */
export async function checkInByCode(eventId: string, code: string): Promise<CheckInResult> {
  // Owner or staff with a check-in role; every scan is logged and the arrival flips atomically.
  const acc = await eventAccess(eventId);
  if (!acc || !acc.canCheckIn) return { status: "error" };
  const token = code.trim().split(/[/?#]/).filter(Boolean).pop() ?? "";
  if (!token) return { status: "unknown" };
  const a = await db.attendee.findUnique({ where: { token } });
  if (!a || a.eventId !== eventId) return { status: "unknown" };
  if (a.status !== "CONFIRMED") return { status: "error", name: a.name };
  const now = new Date();
  const won = await db.attendee.updateMany({ where: { id: a.id, checkedInAt: null }, data: { checkedInAt: now } });
  await db.eventScan.create({ data: { eventId, actorId: acc.user.id, subjectId: a.id, scanType: "CHECKIN", result: won.count ? "ok" : "already" } });
  done();
  if (!won.count) {
    const cur = await db.attendee.findUnique({ where: { id: a.id } });
    return { status: "already", name: a.name, company: a.company, at: (cur?.checkedInAt ?? now).toISOString() };
  }
  return { status: "ok", name: a.name, company: a.company, at: now.toISOString() };
}

export async function setCheckedIn(fd: FormData) {
  const { event } = await own(fd.get("eventId"));
  const on = fd.get("on") === "1";
  await db.attendee.updateMany({ where: { id: String(fd.get("id")), eventId: event.id }, data: { checkedInAt: on ? new Date() : null } });
  done();
}

export async function removeAttendee(fd: FormData) {
  const { event } = await own(fd.get("eventId"));
  await db.attendee.deleteMany({ where: { id: String(fd.get("id")), eventId: event.id } });
  done();
}

/** Organizer approves a pending registration or promotes someone off the waitlist, and sends the confirmation. */
export async function setAttendeeStatus(fd: FormData) {
  const { event } = await own(fd.get("eventId"));
  const status = String(fd.get("status"));
  if (!["CONFIRMED", "CANCELLED"].includes(status)) return;
  const a = await db.attendee.findFirst({ where: { id: String(fd.get("id")), eventId: event.id } });
  if (!a) return;
  await db.attendee.update({ where: { id: a.id }, data: { status } });
  if (status === "CONFIRMED") await notify("registration_confirmed", a.email, a.id, `You're in: ${event.name}`, `Hi ${a.name}, your registration for ${event.name} is confirmed. Your ticket: /e/${event.slug}/ticket/${a.token}`);
  done();
}

export async function addTicketClass(fd: FormData) {
  const { event } = await own(fd.get("eventId"));
  const name = String(fd.get("name") ?? "").trim().slice(0, 40);
  if (!name) return;
  await db.ticketClass.create({ data: { eventId: event.id, name, quota: Math.max(0, parseInt(String(fd.get("quota") ?? "0"), 10) || 0), price: Math.max(0, parseInt(String(fd.get("price") ?? "0"), 10) || 0) } });
  done();
}
export async function removeTicketClass(fd: FormData) {
  const { event } = await own(fd.get("eventId"));
  await db.ticketClass.deleteMany({ where: { id: String(fd.get("id")), eventId: event.id } });
  done();
}

/** Drafts are invisible to the public. Publishing makes the event page and registration live. */
export async function setPublished(fd: FormData) {
  const { event } = await own(fd.get("id"));
  await db.event.update({ where: { id: event.id }, data: { published: fd.get("on") === "1" } });
  done();
}

/** Message everyone who has a confirmed place (an update, a reminder, a change of room). Each person is emailed once per message. */
export async function sendAnnouncement(fd: FormData) {
  const { event } = await own(fd.get("eventId"));
  const subject = String(fd.get("subject") ?? "").trim().slice(0, 120);
  const body = String(fd.get("body") ?? "").trim().slice(0, 2000);
  if (!subject || !body) redirect(`/app/events/${event.id}?err=msg`);
  const a = await db.eventAnnouncement.create({ data: { eventId: event.id, subject, body } });
  const people = await db.attendee.findMany({ where: { eventId: event.id, status: "CONFIRMED" } });
  let sent = 0;
  for (const p of people) { if ((await notify("event_announcement", p.email, `${a.id}:${p.id}`, `${event.name}: ${subject}`, body)) !== "duplicate") sent++; }
  await db.eventAnnouncement.update({ where: { id: a.id }, data: { sent } });
  done();
  redirect(`/app/events/${event.id}?saved=1`);
}

/** A copy of an event's settings, questions, ticket types and links, as a draft with no registrations. */
export async function duplicateEvent(fd: FormData) {
  const { event } = await own(fd.get("id"));
  let slug = `${slugify(event.name) || "event"}-${randomBytes(2).toString("hex")}`;
  while (await db.event.findUnique({ where: { slug } })) slug = `${slugify(event.name)}-${randomBytes(3).toString("hex")}`;
  const { id: _id, slug: _s, createdAt: _c, ...rest } = event; void _id; void _s; void _c;
  const copy = await db.event.create({ data: { ...rest, slug, name: `${event.name} (copy)`.slice(0, 120), published: false } });
  const [tickets, links] = await Promise.all([db.ticketClass.findMany({ where: { eventId: event.id } }), db.eventLink.findMany({ where: { eventId: event.id } })]);
  for (const t of tickets) await db.ticketClass.create({ data: { eventId: copy.id, name: t.name, quota: t.quota, price: t.price, currency: t.currency } });
  for (const l of links) await db.eventLink.create({ data: { eventId: copy.id, purpose: l.purpose, label: l.label, url: l.url, order: l.order } });
  done();
  redirect(`/app/events/${copy.id}?saved=1`);
}
