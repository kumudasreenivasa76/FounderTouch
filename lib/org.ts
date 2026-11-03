import { getUpload, putUpload } from "@/lib/storage";
import path from "path";
import { randomBytes } from "crypto";
import { db } from "./db";

export const ROLES = ["OWNER", "ADMIN", "MEMBER"] as const;
export type OrgRole = (typeof ROLES)[number];

/** The signed-in person's organization and role, or null if they are not in one. */
export async function membership(userId: string) {
  const m = await db.orgMember.findUnique({ where: { userId }, include: { org: true } });
  return m ? { member: m, org: m.org, role: m.role as OrgRole, isAdmin: m.role === "OWNER" || m.role === "ADMIN", isOwner: m.role === "OWNER" } : null;
}

/** Colours used for the team brand, in the same "custom:#from:#to" form profile themes already use. */
export const orgTheme = (o: { color1: string; color2: string }) => (o.color1 && o.color2 ? `custom:${o.color1}:${o.color2}` : "");

/** True when the person's team has locked the brand, so they may not change colours, company or logo. */
export async function brandLocked(userId: string) {
  const m = await db.orgMember.findUnique({ where: { userId }, include: { org: true } });
  return !!m && m.org.brandLocked && m.role === "MEMBER";
}

/** Puts the team brand on one person's card: colours, company name and a private copy of the logo. */
export async function applyBrand(profileId: string, org: { company: string; color1: string; color2: string; logo: string; name: string }) {
  const data: { theme?: string; company?: string; logo?: string } = {};
  const t = orgTheme(org);
  if (t) data.theme = t;
  if (org.company || org.name) data.company = org.company || org.name;
  if (org.logo) {
    // Each person gets their own copy, so removing one never breaks anyone else's card.
    const ext = path.extname(org.logo);
    const name = "logo-" + randomBytes(8).toString("hex") + ext;
    try { await putUpload(name, await getUpload(org.logo)); data.logo = name; } catch { /* logo file missing: keep the old one */ }
  }
  if (Object.keys(data).length) await db.profile.update({ where: { id: profileId }, data });
}

export async function audit(orgId: string, actorId: string, action: string, detail = "") {
  await db.orgAudit.create({ data: { orgId, actorId, action, detail: detail.slice(0, 200) } }).catch(() => {});
}
