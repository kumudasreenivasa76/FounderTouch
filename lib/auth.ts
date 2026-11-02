import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { MODES, MODE_INFO } from "./modes";

export function hashPassword(pw: string) {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + scryptSync(pw, salt, 32).toString("hex");
}
export function checkPassword(pw: string, stored: string) {
  const [salt, hash] = stored.split(":");
  const a = Buffer.from(hash, "hex"), b = scryptSync(pw, salt, 32);
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function startSession(userId: string) {
  const token = randomBytes(24).toString("hex");
  await db.session.create({ data: { token, userId } });
  await db.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } });
  (await cookies()).set("sid", token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
}
export async function endSession() {
  const c = await cookies(), t = c.get("sid")?.value;
  if (t) await db.session.deleteMany({ where: { token: t } });
  c.delete("sid");
}
export async function currentUser() {
  const t = (await cookies()).get("sid")?.value;
  return t ? userForToken(t) : null;
}

/** The active user behind a session token (cookie or mobile bearer). Suspended accounts get nothing. */
export async function userForToken(token: string) {
  const s = await db.session.findUnique({ where: { token }, include: { user: { include: { profile: true } } } });
  if (!s || s.user.status !== "ACTIVE") return null;
  // Remember when people were last around, at most once every ten minutes.
  if (Date.now() - s.lastUsedAt.getTime() > 10 * 60 * 1000) {
    const now = new Date();
    await db.session.update({ where: { token }, data: { lastUsedAt: now } });
    await db.user.update({ where: { id: s.userId }, data: { lastSeenAt: now } });
  }
  return s.user;
}

/** A session for the mobile app; the token goes in the Authorization header. */
export async function startMobileSession(userId: string, device: string) {
  const token = randomBytes(32).toString("hex");
  await db.session.create({ data: { token, userId, kind: "mobile", device: device.slice(0, 80) } });
  await db.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } });
  return token;
}
/** Older profiles are missing modes added later (e.g. Seller, Services). Create them, copying the "All" mode's sections. */
async function ensureModes(profileId: string) {
  const have = new Set((await db.modeConfig.findMany({ where: { profileId }, select: { mode: true } })).map((m) => m.mode));
  const missing = MODES.filter((m) => !have.has(m));
  if (!missing.length) return;
  const all = await db.modeConfig.findFirst({ where: { profileId, mode: "ALL" } });
  for (const m of missing) {
    await db.modeConfig.create({ data: { profileId, mode: m, sectionIds: all?.sectionIds ?? "[]", bookingUrl: all?.bookingUrl ?? "", ctaLabel: MODE_INFO[m].cta, isEnabled: true } });
    if (!(await db.shareLink.findFirst({ where: { profileId, mode: m } }))) await db.shareLink.create({ data: { profileId, mode: m, token: randomBytes(6).toString("hex") } });
  }
}

/** Signed-in user with a finished profile, else redirect. */
export async function requireOwner() {
  const u = await currentUser();
  if (!u) redirect("/login");
  if (!u.profile) redirect("/onboarding");
  await ensureModes(u.profile.id);
  return { user: u, profile: u.profile };
}
