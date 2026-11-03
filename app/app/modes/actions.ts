"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { MODES } from "@/lib/modes";

const valid = (m: string) => (MODES as readonly string[]).includes(m) && m !== "ALL";
const refresh = () => revalidatePath("/app", "layout");

/** The owner chooses a mode to set up. It appears on their card once added, then they fill it in. */
export async function addMode(fd: FormData) {
  const { profile } = await requireOwner();
  const mode = String(fd.get("mode"));
  if (!valid(mode)) redirect("/app/card");
  await db.modeConfig.updateMany({ where: { profileId: profile.id, mode }, data: { added: true, isEnabled: true } });
  refresh();
  redirect(mode === "HIRE" ? "/app/profile/work" : `/app/profile/kit?mode=${mode}`);
}

/** Takes a mode off the card. Everything inside it is kept, so adding it back restores it. */
export async function removeMode(fd: FormData) {
  const { profile } = await requireOwner();
  const mode = String(fd.get("mode"));
  if (valid(mode)) await db.modeConfig.updateMany({ where: { profileId: profile.id, mode }, data: { added: false, isEnabled: false } });
  refresh();
  redirect("/app/card");
}

/** The Hire me switch: show or hide the Hire me page on the card. */
export async function toggleHire(fd: FormData) {
  const { profile } = await requireOwner();
  const on = fd.get("on") === "1";
  await db.modeConfig.updateMany({ where: { profileId: profile.id, mode: "HIRE" }, data: on ? { added: true, isEnabled: true } : { isEnabled: false } });
  refresh();
  redirect("/app");
}

/** The "Open to work" badge on or off. */
export async function toggleOpenToWork(fd: FormData) {
  const { profile } = await requireOwner();
  const on = fd.get("on") === "1";
  const keep = profile.openTo && profile.openTo !== "Not looking" ? profile.openTo : "Open to work";
  await db.profile.update({ where: { id: profile.id }, data: { openTo: on ? keep : "" } });
  refresh();
  redirect("/app");
}
