"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { parseSigPrefs } from "@/lib/signature";
import { parseBgPrefs } from "@/lib/background";

/** Remembers the signature design and options the owner chose. The input is re-checked, never stored as sent. */
export async function saveSigPrefs(json: string) {
  const { profile } = await requireOwner();
  await db.profile.update({ where: { id: profile.id }, data: { sigPrefs: JSON.stringify(parseSigPrefs(String(json).slice(0, 4000))) } });
  revalidatePath("/dashboard/signature");
  revalidatePath("/app/tools");
}

/** Remembers the video-call background design and options. */
export async function saveBgPrefs(json: string) {
  const { profile } = await requireOwner();
  await db.profile.update({ where: { id: profile.id }, data: { bgPrefs: JSON.stringify(parseBgPrefs(String(json).slice(0, 2000))) } });
  revalidatePath("/dashboard/backgrounds");
  revalidatePath("/app/tools");
}
