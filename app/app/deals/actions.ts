"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { DEAL_STAGES } from "@/lib/deals";

export async function moveDeal(fd: FormData) {
  const { profile } = await requireOwner();
  const stage = String(fd.get("stage"));
  if (!DEAL_STAGES.some((s) => s.key === stage)) return;
  await db.deal.updateMany({ where: { id: String(fd.get("id")), profileId: profile.id }, data: { stage } });
  revalidatePath("/app/deals");
}

export async function addDeal(fd: FormData) {
  const { profile } = await requireOwner();
  const g = (k: string, n = 200) => String(fd.get(k) ?? "").trim().slice(0, n);
  if (!g("company")) redirect("/app/deals?err=1");
  const deck = g("deckUrl", 500);
  await db.deal.create({ data: { profileId: profile.id, company: g("company", 120), founder: g("founder", 120), email: g("email").toLowerCase(), round: g("round", 40), amount: g("amount", 60), deckUrl: /^https?:\/\//i.test(deck) ? deck : "", note: g("note", 1500) } });
  revalidatePath("/app/deals");
  redirect("/app/deals?saved=1");
}

export async function saveDealNote(fd: FormData) {
  const { profile } = await requireOwner();
  await db.deal.updateMany({ where: { id: String(fd.get("id")), profileId: profile.id }, data: { note: String(fd.get("note") ?? "").slice(0, 1500) } });
  revalidatePath("/app/deals");
}

export async function deleteDeal(fd: FormData) {
  const { profile } = await requireOwner();
  await db.deal.deleteMany({ where: { id: String(fd.get("id")), profileId: profile.id } });
  revalidatePath("/app/deals");
}
