import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { authed, body, fail, ok, originOf, str } from "@/lib/api";
import { MODES, MODE_INFO, Mode } from "@/lib/modes";
import { byline, themeOf } from "@/lib/look";

/** Reads a scanned QR or link and says whose card it is. Public details only. */
export const POST = authed(async (req, { user }) => {
  const raw = str((await body<{ code: string }>(req)).code, 400);
  const m = /\/(?:t|s)\/([a-z0-9]{6,})/i.exec(raw) ?? /^([a-z0-9]{6,})$/i.exec(raw);
  if (!m) return ok({ kind: "other", text: raw });
  const link = await db.shareLink.findUnique({ where: { token: m[1] }, include: { profile: { include: { user: { select: { status: true } } } } } });
  if (!link || !(MODES as readonly string[]).includes(link.mode) || (link.profile.user && link.profile.user.status !== "ACTIVE")) return fail("not_found", 404, "That code is not a FounderTouch card.");
  const p = link.profile, origin = originOf(req);
  const saved = !!(await db.savedCard.findUnique({ where: { userId_profileId: { userId: user.id, profileId: p.id } } }));
  return ok({
    kind: "card", handle: p.handle, name: p.name, byline: byline(p.headline, p.company), mode: link.mode, modeLabel: MODE_INFO[link.mode as Mode].label,
    photoUrl: p.photo ? `${origin}/photo/${p.handle}?v=${encodeURIComponent(p.photo)}` : null, pageUrl: `${origin}/${p.handle}?mode=${link.mode}`,
    own: p.id === user.profile!.id, saved, theme: { from: themeOf(p.theme).from, to: themeOf(p.theme).to },
  });
});
