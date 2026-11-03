"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { membership, applyBrand, audit, ROLES } from "@/lib/org";
import { notify } from "@/lib/notify";
import { putUpload } from "@/lib/storage";

const done = (to = "/app/org") => { revalidatePath("/app/org", "layout"); redirect(to); };
const hex = (v: FormDataEntryValue | null) => (/^#[0-9a-f]{6}$/i.test(String(v ?? "").trim()) ? String(v).trim().toLowerCase() : "");

async function admin() {
  const { user, profile } = await requireOwner();
  const m = await membership(user.id);
  if (!m || !m.isAdmin) redirect("/app/org");
  return { user, profile, ...m };
}

export async function createOrg(fd: FormData) {
  const { user, profile } = await requireOwner();
  if (await membership(user.id)) redirect("/app/org");
  const name = String(fd.get("name") ?? "").trim().slice(0, 80);
  if (!name) redirect("/app/org?err=name");
  const org = await db.organization.create({ data: { name, company: String(fd.get("company") ?? "").trim().slice(0, 80) || profile.company } });
  await db.orgMember.create({ data: { orgId: org.id, userId: user.id, role: "OWNER" } });
  await audit(org.id, user.id, "org.created", name);
  done();
}

/** Invite several people at once (one email per line or comma separated). Each gets a private join link. */
export async function inviteMany(fd: FormData) {
  const a = await admin();
  const role = String(fd.get("role")) === "ADMIN" && a.isOwner ? "ADMIN" : "MEMBER";
  const emails = [...new Set(String(fd.get("emails") ?? "").split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter((e) => /^\S+@\S+\.\S+$/.test(e)))].slice(0, 100);
  if (!emails.length) redirect("/app/org/people?err=emails");
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  for (const email of emails) {
    const existing = await db.user.findUnique({ where: { email } });
    if (existing && (await db.orgMember.findUnique({ where: { userId: existing.id } }))) continue; // already on a team
    const inv = await db.orgInvite.upsert({ where: { orgId_email: { orgId: a.org.id, email } }, update: { role }, create: { orgId: a.org.id, email, role, token: randomBytes(16).toString("hex") } });
    await notify("org_invite", email, inv.id, `Join ${a.org.name} on FounderTouch`, `${a.profile.name} invited you to join ${a.org.name}. Accept here: ${origin}/join/${inv.token}`);
  }
  await audit(a.org.id, a.user.id, "members.invited", `${emails.length} invited`);
  done("/app/org/people?saved=1");
}

export async function revokeInvite(fd: FormData) {
  const a = await admin();
  await db.orgInvite.deleteMany({ where: { id: String(fd.get("id")), orgId: a.org.id } });
  await audit(a.org.id, a.user.id, "invite.revoked");
  done("/app/org/people");
}

export async function removeMember(fd: FormData) {
  const a = await admin();
  const m = await db.orgMember.findFirst({ where: { id: String(fd.get("id")), orgId: a.org.id } });
  if (!m || m.role === "OWNER" || m.userId === a.user.id) redirect("/app/org/people");
  if (m.role === "ADMIN" && !a.isOwner) redirect("/app/org/people");
  await db.orgMember.delete({ where: { id: m.id } }); // de-provision: they keep their own card, minus the team link
  await audit(a.org.id, a.user.id, "member.removed", m.userId);
  done("/app/org/people");
}

export async function setRole(fd: FormData) {
  const a = await admin();
  const role = String(fd.get("role"));
  if (!a.isOwner || !(ROLES as readonly string[]).includes(role) || role === "OWNER") redirect("/app/org/people");
  await db.orgMember.updateMany({ where: { id: String(fd.get("id")), orgId: a.org.id, role: { not: "OWNER" } }, data: { role } });
  await audit(a.org.id, a.user.id, "role.changed", role);
  done("/app/org/people");
}

/** Brand kit: name, company, colours, logo, campaign banner and the lock. Optionally applies it to everyone right away. */
export async function saveBrandKit(fd: FormData) {
  const a = await admin();
  const data: { name: string; company: string; color1: string; color2: string; brandLocked: boolean; bannerText: string; bannerUrl: string; logo?: string } = {
    name: String(fd.get("name") ?? a.org.name).trim().slice(0, 80) || a.org.name,
    company: String(fd.get("company") ?? "").trim().slice(0, 80),
    color1: hex(fd.get("color1")), color2: hex(fd.get("color2")) || hex(fd.get("color1")),
    brandLocked: fd.get("lock") === "on",
    bannerText: String(fd.get("bannerText") ?? "").trim().slice(0, 120),
    bannerUrl: /^https:\/\//i.test(String(fd.get("bannerUrl") ?? "").trim()) ? String(fd.get("bannerUrl")).trim().slice(0, 300) : "",
  };
  const f = fd.get("logo") as File | null;
  if (f && f.size > 0) {
    const ext = path.extname(f.name).toLowerCase();
    if (![".png", ".jpg", ".jpeg", ".webp"].includes(ext) || f.size > 2 * 1024 * 1024) redirect("/app/org/brand?err=logo");
    const name = "orglogo-" + randomBytes(8).toString("hex") + ext;
    await putUpload(name, Buffer.from(await f.arrayBuffer()));
    data.logo = name;
  } else if (fd.get("rm_logo") === "on") data.logo = "";
  const org = await db.organization.update({ where: { id: a.org.id }, data });
  await audit(org.id, a.user.id, "brand.saved", org.brandLocked ? "locked" : "unlocked");
  if (fd.get("apply") === "on") await pushTo(org.id, org);
  done("/app/org/brand?saved=1");
}

async function pushTo(orgId: string, org: { company: string; color1: string; color2: string; logo: string; name: string }) {
  const members = await db.orgMember.findMany({ where: { orgId } });
  const profiles = await db.profile.findMany({ where: { userId: { in: members.map((m) => m.userId) } }, select: { id: true } });
  for (const p of profiles) await applyBrand(p.id, org);
}

export async function pushBrand() {
  const a = await admin();
  await pushTo(a.org.id, a.org);
  await audit(a.org.id, a.user.id, "brand.pushed");
  done("/app/org/brand?saved=1");
}

export async function leaveOrg() {
  const { user } = await requireOwner();
  const m = await membership(user.id);
  if (!m || m.isOwner) redirect("/app/org?err=owner");
  await db.orgMember.delete({ where: { id: m.member.id } });
  await audit(m.org.id, user.id, "member.left");
  done();
}

/** Connect with a colleague in one tap. Being on the same team is the consent, so both sides are connected straight away. */
export async function connectColleague(fd: FormData) {
  const { user, profile } = await requireOwner();
  const mine = await membership(user.id);
  const them = await db.profile.findUnique({ where: { id: String(fd.get("profileId")) }, include: { user: true } });
  if (!mine || !them?.user || them.id === profile.id) redirect("/app/org/people");
  const theirs = await membership(them.user.id);
  if (!theirs || theirs.org.id !== mine.org.id) redirect("/app/org/people");
  await db.contact.upsert({ where: { profileId_email: { profileId: profile.id, email: them.user.email } }, update: { status: "CONNECTED" }, create: { profileId: profile.id, email: them.user.email, name: them.name, company: them.company, mode: "ALL", source: "team", status: "CONNECTED" } });
  await db.contact.upsert({ where: { profileId_email: { profileId: them.id, email: user.email } }, update: { status: "CONNECTED" }, create: { profileId: them.id, email: user.email, name: profile.name, company: profile.company, mode: "ALL", source: "team", status: "CONNECTED" } });
  done("/app/org/people?connected=1");
}
