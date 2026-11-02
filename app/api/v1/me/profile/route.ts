import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { authed, body, fail, ok, str } from "@/lib/api";
import { createProfile } from "@/lib/platform";
import { MODES } from "@/lib/modes";
import { SOCIALS, socialUrl } from "@/lib/socials";

type In = { firstName: string; lastName: string; handle: string; headline: string; company: string; bio: string; phone: string; email: string; website: string; socials: Record<string, string>; modes: string[] };

const cleanSocials = (s: unknown) => {
  const out: Record<string, string> = {};
  if (s && typeof s === "object") for (const { key } of SOCIALS) { const v = str((s as Record<string, unknown>)[key], 300); if (v) out[key] = socialUrl(key, v); }
  return JSON.stringify(out);
};

/** First-time set-up from the app: creates the card with the chosen modes. */
export const POST = authed(async (req, { user }) => {
  if (user.profile) return fail("exists", 409, "Your card is already set up.");
  const b = await body<In>(req);
  const firstName = str(b.firstName, 60) || user.firstName, lastName = str(b.lastName, 60) || user.lastName;
  const modes = Array.isArray(b.modes) ? b.modes.filter((m): m is string => typeof m === "string" && (MODES as readonly string[]).includes(m)) : [];
  if (!firstName || !str(b.headline)) return fail("details", 400, "Add your name and a headline.");
  const p = await createProfile(user.id, {
    name: `${firstName} ${lastName}`.trim(), firstName, lastName, handle: str(b.handle, 30), headline: str(b.headline, 120), company: str(b.company, 80),
    bio: str(b.bio, 600), phone: str(b.phone, 40), socials: cleanSocials(b.socials), modes: modes.length ? modes : ["FOUNDER"],
  });
  return ok({ handle: p.handle }, 201);
}, { needsProfile: false });

/** Edits the basics, contact details and socials. Only the fields sent are changed. */
export const PATCH = authed(async (req, { user }) => {
  const b = await body<In>(req), p = user.profile!;
  const data: Record<string, string> = {};
  for (const k of ["headline", "company", "bio", "phone", "email", "website"] as const) if (k in b) data[k] = str(b[k], k === "bio" ? 600 : 200);
  if ("firstName" in b || "lastName" in b) {
    data.firstName = str(b.firstName, 60) || p.firstName; data.lastName = str(b.lastName, 60) || p.lastName;
    data.name = `${data.firstName} ${data.lastName}`.trim();
  }
  if ("socials" in b) data.socials = cleanSocials(b.socials);
  if (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) return fail("email", 400, "That email does not look right.");
  await db.profile.update({ where: { id: p.id }, data });
  if (data.name) await db.user.update({ where: { id: user.id }, data: { name: data.name, firstName: data.firstName, lastName: data.lastName } });
  return ok({ ok: true });
});
