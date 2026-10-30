"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";

const UPLOADS = () => path.join(process.cwd(), "uploads");
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
    data: { profileId: profile.id, slug, name: name.slice(0, 120), description: String(fd.get("description") ?? "").trim().slice(0, 2000), location: String(fd.get("location") ?? "").trim().slice(0, 160), startsAt: date(fd.get("startsAt")), endsAt: date(fd.get("endsAt")) },
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
      if (old) await unlink(path.join(UPLOADS(), path.basename(old))).catch(() => {});
      data[key] = "";
      continue;
    }
    const f = fd.get(field) as File | null;
    if (f && f.size > 0) {
      const ext = path.extname(f.name).toLowerCase();
      if (!IMG.includes(ext) || f.size > 5 * 1024 * 1024) redirect(`${back}?err=img`);
      const name = `ev-${field}-${randomBytes(8).toString("hex")}${ext}`;
      await mkdir(UPLOADS(), { recursive: true });
      await writeFile(path.join(UPLOADS(), name), Buffer.from(await f.arrayBuffer()));
      if (old) await unlink(path.join(UPLOADS(), path.basename(old))).catch(() => {});
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
  for (const f of [event.logo, event.cover]) if (f) await unlink(path.join(UPLOADS(), path.basename(f))).catch(() => {});
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
  const { event } = await own(eventId);
  const token = code.trim().split(/[/?#]/).filter(Boolean).pop() ?? "";
  if (!token) return { status: "unknown" };
  const a = await db.attendee.findUnique({ where: { token } });
  if (!a || a.eventId !== event.id) return { status: "unknown" };
  if (a.checkedInAt) return { status: "already", name: a.name, company: a.company, at: a.checkedInAt.toISOString() };
  const now = new Date();
  await db.attendee.update({ where: { id: a.id }, data: { checkedInAt: now } });
  done();
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
