"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { MODES } from "@/lib/modes";
import { SECTIONS } from "@/lib/card-sections";

const RESERVED = new Set(["app", "e", "s", "t", "a", "n", "files", "photo", "logo", "login", "signup", "onboarding", "welcome", "verify", "api", "demo", "dashboard", "company", "event-img", "offline", "auth", "admin", "applicant-file"]);

/** Saves a card's name, its visible sections and its optional custom address. */
export async function saveCard(fd: FormData) {
  const { profile } = await requireOwner();
  const mode = String(fd.get("mode"));
  if (!(MODES as readonly string[]).includes(mode)) redirect("/app/cards");
  const back = `/app/cards/${mode}`;
  const cardName = String(fd.get("cardName") ?? "").trim().slice(0, 40);
  if (!cardName) redirect(`${back}?err=name`);
  const shown = new Set(fd.getAll("show").map(String));
  const hidden = SECTIONS.map(([k]) => k).filter((k) => !shown.has(k)).join(",");
  const slug = String(fd.get("slug") ?? "").trim().toLowerCase();
  if (slug) {
    if (!/^[a-z0-9][a-z0-9-]{2,29}$/.test(slug)) redirect(`${back}?err=slug`);
    const taken = RESERVED.has(slug) || !!(await db.profile.findUnique({ where: { handle: slug }, select: { id: true } }))
      || !!(await db.cardSlug.findFirst({ where: { slug, NOT: { profileId: profile.id, mode } }, select: { id: true } }));
    if (taken) redirect(`${back}?err=taken&try=${encodeURIComponent(slug)}`);
    await db.cardSlug.upsert({ where: { profileId_mode: { profileId: profile.id, mode } }, update: { slug }, create: { profileId: profile.id, mode, slug } });
  } else {
    await db.cardSlug.deleteMany({ where: { profileId: profile.id, mode } });
  }
  await db.modeConfig.updateMany({ where: { profileId: profile.id, mode }, data: { cardName, hidden } });
  revalidatePath("/app/cards");
  redirect("/app/cards?saved=1");
}

/** Live check for the Card URL field: is this address free? */
export async function slugFree(slug: string): Promise<"ok" | "bad" | "taken"> {
  const { profile } = await requireOwner();
  const s = slug.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{2,29}$/.test(s)) return "bad";
  if (RESERVED.has(s) || (await db.profile.findUnique({ where: { handle: s }, select: { id: true } }))) return "taken";
  const other = await db.cardSlug.findUnique({ where: { slug: s } });
  return other && other.profileId !== profile.id ? "taken" : "ok";
}
