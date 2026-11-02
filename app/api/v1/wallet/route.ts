import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { authed, body, fail, ok, originOf, str } from "@/lib/api";
import { MODES, MODE_INFO, Mode } from "@/lib/modes";
import { byline, themeOf } from "@/lib/look";

/** Cards you saved from other people. */
export const GET = authed(async (req, { user }) => {
  const origin = originOf(req);
  const rows = await db.savedCard.findMany({ where: { userId: user.id }, include: { profile: true }, orderBy: { createdAt: "desc" } });
  return ok({
    cards: rows.map((s) => ({
      id: s.id, handle: s.profile.handle, name: s.profile.name, byline: byline(s.profile.headline, s.profile.company),
      mode: s.mode, modeLabel: MODE_INFO[s.mode as Mode]?.label ?? s.mode, at: s.createdAt,
      photoUrl: s.profile.photo ? `${origin}/photo/${s.profile.handle}?v=${encodeURIComponent(s.profile.photo)}` : null,
      pageUrl: `${origin}/${s.profile.handle}?mode=${s.mode}`, theme: { from: themeOf(s.profile.theme).from, to: themeOf(s.profile.theme).to },
    })),
  });
});

/** Save someone's card. */
export const POST = authed(async (req, { user }) => {
  const b = await body<{ handle: string; mode: string }>(req);
  const target = await db.profile.findUnique({ where: { handle: str(b.handle, 40) } });
  if (!target) return fail("not_found", 404, "We could not find that card.");
  if (target.id === user.profile!.id) return fail("own", 400, "That is your own card.");
  const mode = (MODES as readonly string[]).includes(str(b.mode)) ? str(b.mode) : "ALL";
  await db.savedCard.upsert({ where: { userId_profileId: { userId: user.id, profileId: target.id } }, update: { mode }, create: { userId: user.id, profileId: target.id, mode } });
  return ok({ ok: true }, 201);
});
