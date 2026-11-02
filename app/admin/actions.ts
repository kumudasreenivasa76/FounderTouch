"use server";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MODES } from "@/lib/modes";
import { audit, getSettings, requireAdmin, setSetting } from "@/lib/platform";

const s = (fd: FormData, k: string, max = 300) => String(fd.get(k) ?? "").trim().slice(0, max);
const back = (path: string) => { revalidatePath("/admin", "layout"); redirect(path); };

/* ---------- users ---------- */
export async function setUserStatus(fd: FormData) {
  const me = await requireAdmin();
  const id = s(fd, "id"), status = s(fd, "status") === "SUSPENDED" ? "SUSPENDED" : "ACTIVE";
  if (id === me.id) back(`/admin/users/${id}?err=self`);
  const u = await db.user.update({ where: { id }, data: { status } });
  if (status === "SUSPENDED") await db.session.deleteMany({ where: { userId: id } });
  await audit(me, status === "SUSPENDED" ? "user.suspend" : "user.restore", "user", id, u.email);
  back(`/admin/users/${id}?ok=${status === "SUSPENDED" ? "suspended" : "restored"}`);
}

export async function setUserRole(fd: FormData) {
  const me = await requireAdmin();
  const id = s(fd, "id"), role = s(fd, "role") === "ADMIN" ? "ADMIN" : "USER";
  if (id === me.id) back(`/admin/users/${id}?err=self`);
  const u = await db.user.update({ where: { id }, data: { role } });
  await audit(me, role === "ADMIN" ? "user.make_admin" : "user.remove_admin", "user", id, u.email);
  back(`/admin/users/${id}?ok=role`);
}

export async function signOutEverywhere(fd: FormData) {
  const me = await requireAdmin();
  const id = s(fd, "id");
  const n = await db.session.deleteMany({ where: { userId: id } });
  await audit(me, "user.sign_out_all", "user", id, `${n.count} sessions`);
  back(`/admin/users/${id}?ok=signed_out`);
}

export async function revokeSession(fd: FormData) {
  const me = await requireAdmin();
  const id = s(fd, "id"), token = s(fd, "token", 100);
  await db.session.deleteMany({ where: { token, userId: id } });
  await audit(me, "user.revoke_session", "user", id);
  back(`/admin/users/${id}?ok=session`);
}

/** Deleting removes the account, card, files metadata and activity. It needs the email typed back. */
export async function deleteUser(fd: FormData) {
  const me = await requireAdmin();
  const id = s(fd, "id");
  if (id === me.id) back(`/admin/users/${id}?err=self`);
  const u = await db.user.findUnique({ where: { id } });
  if (!u) back("/admin/users");
  if (s(fd, "confirm").toLowerCase() !== u!.email.toLowerCase()) back(`/admin/users/${id}?err=confirm`);
  await db.profile.deleteMany({ where: { userId: id } });
  await db.user.delete({ where: { id } });
  await audit(me, "user.delete", "user", id, u!.email);
  back("/admin/users?ok=deleted");
}

/* ---------- onboarding ---------- */
const cleanModes = (raw: string[]) => raw.map((m) => m.trim().toUpperCase()).filter((m) => (MODES as readonly string[]).includes(m) && m !== "ALL");

async function makeInvite(me: { id: string }, d: { email: string; name?: string; company?: string; headline?: string; modes?: string[]; role?: string; note?: string; batch?: string }, days: number) {
  return db.onboardingInvite.create({
    data: {
      token: randomBytes(18).toString("base64url"), email: d.email.toLowerCase(), name: d.name ?? "", company: d.company ?? "", headline: d.headline ?? "",
      modes: cleanModes(d.modes ?? []).join(","), role: d.role === "ADMIN" ? "ADMIN" : "USER", note: d.note ?? "", batch: d.batch ?? "",
      createdById: me.id, expiresAt: new Date(Date.now() + days * 86400000),
    },
  });
}

export async function createInvite(fd: FormData) {
  const me = await requireAdmin();
  const email = s(fd, "email", 200).toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) back("/admin/onboarding?err=email");
  if (await db.user.findUnique({ where: { email } })) back("/admin/onboarding?err=exists");
  const { inviteDays } = await getSettings();
  const inv = await makeInvite(me, { email, name: s(fd, "name", 120), company: s(fd, "company", 80), headline: s(fd, "headline", 120), modes: fd.getAll("modes").map(String), role: s(fd, "role"), note: s(fd, "note", 300) }, inviteDays);
  await audit(me, "invite.create", "invite", inv.id, email);
  back(`/admin/onboarding?created=${inv.id}`);
}

/** One person per line: email, name, company, headline, modes (modes separated by spaces or |). */
export async function bulkInvite(fd: FormData) {
  const me = await requireAdmin();
  const { inviteDays } = await getSettings();
  const batch = s(fd, "batch", 60) || `Import ${new Date().toISOString().slice(0, 10)}`;
  const defaultModes = fd.getAll("modes").map(String);
  let made = 0, skipped = 0;
  for (const line of s(fd, "rows", 50000).split(/\r?\n/)) {
    const [email = "", name = "", company = "", headline = "", modes = ""] = line.split(/,|\t/).map((c) => c.trim());
    if (!email || /^email$/i.test(email)) continue;
    const e = email.toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(e) || (await db.user.findUnique({ where: { email: e } })) || (await db.onboardingInvite.findFirst({ where: { email: e, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } } }))) { skipped++; continue; }
    await makeInvite(me, { email: e, name, company, headline, modes: modes ? modes.split(/[\s|]+/) : defaultModes, batch }, inviteDays);
    made++;
  }
  await audit(me, "invite.bulk", "batch", batch, `${made} created, ${skipped} skipped`);
  back(`/admin/onboarding?batch=${encodeURIComponent(batch)}&made=${made}&skipped=${skipped}`);
}

export async function revokeInvite(fd: FormData) {
  const me = await requireAdmin();
  const id = s(fd, "id");
  const inv = await db.onboardingInvite.update({ where: { id }, data: { revokedAt: new Date() } });
  await audit(me, "invite.revoke", "invite", id, inv.email);
  back("/admin/onboarding?ok=revoked");
}

export async function extendInvite(fd: FormData) {
  const me = await requireAdmin();
  const id = s(fd, "id");
  const { inviteDays } = await getSettings();
  const inv = await db.onboardingInvite.update({ where: { id }, data: { expiresAt: new Date(Date.now() + inviteDays * 86400000), revokedAt: null } });
  await audit(me, "invite.extend", "invite", id, inv.email);
  back("/admin/onboarding?ok=extended");
}

/* ---------- content ---------- */
export async function closeEvent(fd: FormData) {
  const me = await requireAdmin();
  const id = s(fd, "id"), open = s(fd, "open") === "1";
  const e = await db.event.update({ where: { id }, data: { open } });
  await audit(me, open ? "event.reopen" : "event.close", "event", id, e.name);
  back("/admin/events");
}

export async function closeJob(fd: FormData) {
  const me = await requireAdmin();
  const id = s(fd, "id"), open = s(fd, "open") === "1";
  const j = await db.job.update({ where: { id }, data: { open } });
  await audit(me, open ? "job.reopen" : "job.close", "job", id, j.title);
  back("/admin/jobs");
}

export async function removeResource(fd: FormData) {
  const me = await requireAdmin();
  const id = s(fd, "id");
  const r = await db.resource.delete({ where: { id } });
  await audit(me, "content.remove", "resource", id, r.title);
  back("/admin/content?ok=removed");
}

/* ---------- settings ---------- */
export async function saveSettings(fd: FormData) {
  const me = await requireAdmin();
  const signup = s(fd, "signup") === "invite" ? "invite" : "open";
  const domains = s(fd, "domains", 500).split(/[\s,]+/).map((d) => d.replace(/^@/, "").toLowerCase()).filter(Boolean).join(",");
  const days = Math.min(90, Math.max(1, Number(s(fd, "inviteDays")) || 14));
  await setSetting("signup", signup);
  await setSetting("domains", domains);
  await setSetting("inviteDays", String(days));
  await setSetting("notice", s(fd, "notice", 240));
  await audit(me, "settings.save", "settings", "", `signup=${signup} domains=${domains || "any"} inviteDays=${days}`);
  back("/admin/settings?ok=1");
}
