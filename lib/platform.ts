import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { db } from "./db";
import { currentUser } from "./auth";
import { MODES, MODE_INFO } from "./modes";

/* ---------- settings ---------- */
export type Settings = {
  signup: "open" | "invite";   // who can create an account
  domains: string;             // comma-separated email domains allowed to sign up; empty = any
  notice: string;              // banner shown in the app and mobile app; empty = none
  inviteDays: number;          // how long an invite link works
};
const DEFAULTS: Settings = { signup: "open", domains: "", notice: "", inviteDays: 14 };

export async function getSettings(): Promise<Settings> {
  const rows = await db.setting.findMany();
  const s: Record<string, unknown> = { ...DEFAULTS };
  for (const r of rows) s[r.key] = r.key === "inviteDays" ? Number(r.value) || DEFAULTS.inviteDays : r.value;
  return s as Settings;
}
export async function setSetting(key: keyof Settings, value: string) {
  await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
}

/** Whether this email may sign up without an invite. */
export async function signupAllowed(email: string): Promise<{ ok: true } | { ok: false; reason: "invite" | "domain" }> {
  const s = await getSettings();
  if (s.signup === "invite") return { ok: false, reason: "invite" };
  const allowed = s.domains.split(",").map((d) => d.trim().toLowerCase().replace(/^@/, "")).filter(Boolean);
  if (allowed.length && !allowed.includes(email.split("@")[1] ?? "")) return { ok: false, reason: "domain" };
  return { ok: true };
}

/* ---------- admin ---------- */
export async function requireAdmin() {
  const u = await currentUser();
  if (!u) redirect("/login?next=/admin");
  if (u.role !== "ADMIN") redirect("/app");
  return u;
}
export async function audit(actor: { id: string; email: string }, action: string, targetType = "", targetId = "", detail = "") {
  await db.auditLog.create({ data: { actorId: actor.id, actorEmail: actor.email, action, targetType, targetId, detail: detail.slice(0, 500) } });
}

/* ---------- accounts ---------- */
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
export const RESERVED_HANDLES = ["app", "e", "s", "t", "a", "files", "photo", "logo", "login", "signup", "onboarding", "api", "demo", "admin", "join", "card", "wallet", "event-img", "applicant-file"];

export async function freeHandle(wanted: string, fallback: string) {
  let handle = slug(wanted) || slug(fallback) || "me";
  while (RESERVED_HANDLES.includes(handle) || (await db.profile.findUnique({ where: { handle } }))) handle = `${handle.slice(0, 24)}-${randomBytes(2).toString("hex")}`;
  return handle;
}

/** Creates a profile with every mode and its share link, the same way the web onboarding does. */
export async function createProfile(userId: string, d: {
  name: string; firstName: string; lastName: string; handle?: string; headline?: string; company?: string; bio?: string; phone?: string;
  socials?: string; bookingUrl?: string; modes: string[];
}) {
  const handle = await freeHandle(d.handle ?? "", d.name);
  const p = await db.profile.create({
    data: { userId, handle, name: d.name, firstName: d.firstName, lastName: d.lastName, headline: d.headline ?? "", company: d.company ?? "", bio: d.bio ?? "", phone: d.phone ?? "", socials: d.socials ?? "{}" },
  });
  const picked = new Set(d.modes);
  for (const m of MODES) {
    await db.modeConfig.create({ data: { profileId: p.id, mode: m, sectionIds: "[]", bookingUrl: d.bookingUrl ?? "", ctaLabel: MODE_INFO[m].cta, isEnabled: m === "ALL" || picked.has(m) } });
    await db.shareLink.create({ data: { profileId: p.id, mode: m, token: randomBytes(6).toString("hex") } });
  }
  return p;
}

/* ---------- invites ---------- */
export const inviteState = (i: { acceptedAt: Date | null; revokedAt: Date | null; expiresAt: Date }) =>
  i.acceptedAt ? "ACCEPTED" : i.revokedAt ? "REVOKED" : i.expiresAt < new Date() ? "EXPIRED" : "PENDING";

/** A usable invite for this token, or null. */
export async function openInvite(token: string) {
  const i = await db.onboardingInvite.findUnique({ where: { token } });
  return i && inviteState(i) === "PENDING" ? i : null;
}
