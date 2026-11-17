"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { validDate } from "@/lib/career";

type Item = { type?: string; title?: string; org?: string; location?: string; start?: string; end?: string; description?: string };
type Payload = { headline?: string; bio?: string; skills?: string[]; items?: Item[] };

const key = (t: string, a: string, b: string) => `${t}|${a.trim().toLowerCase()}|${b.trim().toLowerCase()}`;

/** Saves the parts of an import the owner ticked. Existing entries are kept; exact repeats are skipped. */
export async function applyImport(json: string) {
  const { profile } = await requireOwner();
  let p: Payload = {};
  try { p = JSON.parse(String(json).slice(0, 400000)) ?? {}; } catch { redirect("/app/profile/import?err=1"); }

  const existing = await db.careerItem.findMany({ where: { profileId: profile.id }, select: { type: true, title: true, org: true } });
  const have = new Set(existing.map((e) => key(e.type, e.title, e.org)));
  const rows = (Array.isArray(p.items) ? p.items : []).slice(0, 60).flatMap((it) => {
    const type = it.type === "EDUCATION" ? "EDUCATION" : "EXPERIENCE";
    const title = String(it.title ?? "").trim().slice(0, 120), org = String(it.org ?? "").trim().slice(0, 120);
    if (!title || !org || have.has(key(type, title, org))) return [];
    have.add(key(type, title, org));
    return [{ profileId: profile.id, type, title, org, location: String(it.location ?? "").trim().slice(0, 80), start: validDate(String(it.start ?? "").trim()), end: validDate(String(it.end ?? "").trim()), description: String(it.description ?? "").trim().slice(0, 1200) }];
  });
  if (rows.length) await db.careerItem.createMany({ data: rows });

  const data: { headline?: string; bio?: string; skills?: string } = {};
  if (typeof p.headline === "string" && p.headline.trim()) data.headline = p.headline.trim().slice(0, 120);
  if (typeof p.bio === "string" && p.bio.trim()) data.bio = p.bio.trim().slice(0, 600);
  if (Array.isArray(p.skills) && p.skills.length) {
    const old = profile.skills.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
    const seen = new Set(old.map((s) => s.toLowerCase()));
    const add = p.skills.map((s) => String(s).trim()).filter((s) => s && s.length <= 40 && !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()));
    data.skills = [...old, ...add].join(", ").slice(0, 600);
  }
  if (Object.keys(data).length) await db.profile.update({ where: { id: profile.id }, data });

  revalidatePath("/app", "layout");
  redirect(`/app/profile/work?saved=1&imported=${rows.length}`);
}
