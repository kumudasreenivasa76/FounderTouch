"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { MODES, MODE_INFO, Mode } from "@/lib/modes";
import { byline } from "@/lib/look";

export type Found = { ok: true; name: string; sub: string; handle: string; mode: string; modeLabel: string; initials: string; own: boolean } | { ok: false };

/** Reads what a tapped tag or phone sent (a FounderTouch link or its code) and says whose card it is. Public info only. */
export async function peekTap(raw: string): Promise<Found> {
  const { profile } = await requireOwner();
  const m = /\/(?:t|s)\/([a-z0-9]{6,})/i.exec(raw) ?? /^([a-z0-9]{6,})$/i.exec(raw.trim());
  if (!m) return { ok: false };
  const link = await db.shareLink.findUnique({ where: { token: m[1] }, include: { profile: true } });
  if (!link || !(MODES as readonly string[]).includes(link.mode)) return { ok: false };
  const p = link.profile;
  return {
    ok: true, name: p.name, sub: byline(p.headline, p.company), handle: p.handle, mode: link.mode, modeLabel: MODE_INFO[link.mode as Mode].label,
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
