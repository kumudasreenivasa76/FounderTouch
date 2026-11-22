"use server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { MODES, MODE_INFO, Mode, modeFromSlug } from "@/lib/modes";
import { byline } from "@/lib/look";

export type Found = { ok: true; name: string; sub: string; handle: string; mode: string; modeLabel: string; initials: string; own: boolean } | { ok: false };

/** A card page address (/handle, /handle/founder, a custom /slug, or ?mode=) pasted or scanned from a TapNodd page. */
async function fromPageLink(raw: string) {
  let u: URL;
  const t = raw.trim();
  // "tapnodd.com/kumuda" or "localhost:4410/kumuda" (no scheme) is a full address; a bare "kumuda" is just the path
  const full = /^https?:\/\//i.test(t) ? t : /^[\w-]+(\.[\w-]+)*(:\d+)?\//.test(t) && /[.:]/.test(t.split("/")[0]) ? `https://${t}` : `https://x/${t.replace(/^\/+/, "")}`;
  try { u = new URL(full); } catch { return null; }
  const own = (await headers()).get("host") ?? "";
  if (u.host !== "x" && u.host !== own && !/(^|\.)tapnodd\.com$/i.test(u.hostname)) return null;
  const [first, second] = u.pathname.split("/").filter(Boolean).map((x) => decodeURIComponent(x).toLowerCase());
  if (!first || !/^[a-z0-9_-]{2,40}$/.test(first)) return null;
  const qMode = u.searchParams.get("mode") ?? "";
  const profile = await db.profile.findUnique({ where: { handle: first } });
  if (profile) {
    const mode = (MODES as readonly string[]).includes(qMode) ? qMode : (second && modeFromSlug(second)) || "ALL";
    return { profile, mode };
  }
  const custom = await db.cardSlug.findUnique({ where: { slug: first } });
  const owner = custom && await db.profile.findUnique({ where: { id: custom.profileId } });
  return owner ? { profile: owner, mode: custom.mode } : null;
}

/** Reads what a tapped tag or phone sent (a TapNodd link or its code) and says whose card it is. Public info only. */
export async function peekTap(raw: string): Promise<Found> {
  const { profile } = await requireOwner();
  const m = /\/(?:t|s)\/([a-z0-9]{6,})/i.exec(raw) ?? /^([a-z0-9]{6,})$/i.exec(raw.trim());
  const link = m ? await db.shareLink.findUnique({ where: { token: m[1] }, include: { profile: true } }) : null;
  const hit = link && (MODES as readonly string[]).includes(link.mode) ? { profile: link.profile, mode: link.mode } : await fromPageLink(raw);
  if (!hit) return { ok: false };
  const p = hit.profile, mode = hit.mode as Mode;
  return {
    ok: true, name: p.name, sub: byline(p.headline, p.company), handle: p.handle, mode, modeLabel: MODE_INFO[mode].label,
    initials: p.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join(""), own: p.id === profile.id,
  };
}

/** Saves the person you just tapped into your wallet. */
export async function saveTapCard(handle: string, mode: string): Promise<{ ok: boolean; own?: boolean }> {
  const { user, profile } = await requireOwner();
  const target = await db.profile.findUnique({ where: { handle } });
  if (!target) return { ok: false };
  if (target.id === profile.id) return { ok: false, own: true };
  const m = (MODES as readonly string[]).includes(mode) ? mode : "ALL";
  await db.savedCard.upsert({ where: { userId_profileId: { userId: user.id, profileId: target.id } }, update: { mode: m }, create: { userId: user.id, profileId: target.id, mode: m } });
  revalidatePath("/app");
  return { ok: true };
}
