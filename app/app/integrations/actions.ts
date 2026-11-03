"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { membership, audit } from "@/lib/org";
import { safeHttpsUrl } from "@/lib/safe-url";
import { deliver, EVENTS } from "@/lib/integrations";

/** Who owns what: a personal integration belongs to your card; a team one belongs to the organization and needs an admin. */
async function scope(fd: FormData) {
  const { user, profile } = await requireOwner();
  if (String(fd.get("scope")) === "org") {
    const m = await membership(user.id);
    if (!m || !m.isAdmin) redirect("/app/org");
    return { where: { orgId: m.org.id }, create: { orgId: m.org.id, profileId: "" }, back: "/app/org/integrations", orgId: m.org.id, user, profile };
  }
  return { where: { profileId: profile.id }, create: { profileId: profile.id, orgId: "" }, back: "/app/integrations", orgId: "", user, profile };
}
const done = (to: string) => { revalidatePath(to); redirect(to + "?saved=1"); };

export async function addIntegration(fd: FormData) {
  const s = await scope(fd);
  const label = String(fd.get("label") ?? "").trim().slice(0, 60);
  const url = await safeHttpsUrl(String(fd.get("url") ?? ""));
  if (!label || !url) redirect(`${s.back}?err=url`);
  const events = EVENTS.filter((e) => fd.get("ev_" + e) === "on").join(",");
  const kind = String(fd.get("kind")) === "SLACK" ? "SLACK" : "WEBHOOK";
  await db.integration.create({ data: { ...s.create, kind, label, url: url.toString(), secret: kind === "WEBHOOK" ? randomBytes(16).toString("hex") : "", events: events || EVENTS.join(",") } });
  if (s.orgId) await audit(s.orgId, s.user.id, "integration.added", label);
  done(s.back);
}

export async function toggleIntegration(fd: FormData) {
  const s = await scope(fd);
  const i = await db.integration.findFirst({ where: { id: String(fd.get("id")), ...s.where } });
  if (i) await db.integration.update({ where: { id: i.id }, data: { enabled: !i.enabled } });
  done(s.back);
}

export async function deleteIntegration(fd: FormData) {
  const s = await scope(fd);
  await db.integration.deleteMany({ where: { id: String(fd.get("id")), ...s.where } });
  if (s.orgId) await audit(s.orgId, s.user.id, "integration.removed");
  done(s.back);
}

/** Sends a sample event so you can see it arrive. */
export async function testIntegration(fd: FormData) {
  const s = await scope(fd);
  const i = await db.integration.findFirst({ where: { id: String(fd.get("id")), ...s.where } });
  if (i) await deliver(i, "contact.created", { name: "Test Person", email: "test@example.com", company: "Example Co", note: "This is a test from FounderTouch" });
  done(s.back);
}

/** A personal API key for reading your contacts. Shown once; only its hash is kept. */
export async function createToken(fd: FormData) {
  const { profile } = await requireOwner();
  const raw = "ft_" + randomBytes(24).toString("hex");
  await db.apiToken.create({ data: { profileId: profile.id, label: String(fd.get("label") ?? "").trim().slice(0, 60) || "API key", tokenHash: createHash("sha256").update(raw).digest("hex") } });
  (await cookies()).set("new_token", raw, { httpOnly: true, sameSite: "strict", path: "/app/integrations", maxAge: 60 });
  revalidatePath("/app/integrations");
  redirect("/app/integrations");
}

export async function revokeToken(fd: FormData) {
  const { profile } = await requireOwner();
  await db.apiToken.deleteMany({ where: { id: String(fd.get("id")), profileId: profile.id } });
  revalidatePath("/app/integrations");
  redirect("/app/integrations");
}
