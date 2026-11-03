"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { MODES } from "@/lib/modes";
import { THEMES } from "@/lib/look";
import { brandLocked } from "@/lib/org";

/** One of the preset card colours. */
export async function setTheme(fd: FormData) {
  const { user, profile } = await requireOwner();
  const rr = String(fd.get("ret"));
  const back = (qs: string) => /^kit:[A-Z]+$/.test(rr) ? `/app/profile/kit?mode=${rr.slice(4)}&tab=brand&${qs}` : `/app/settings?${qs}`;
  if (await brandLocked(user.id)) redirect(back("err=locked"));
  const theme = String(fd.get("theme"));
  if (!(theme in THEMES)) return;
  await db.profile.update({ where: { id: profile.id }, data: { theme } });
  revalidatePath("/app", "layout");
  redirect(back("saved=1"));
}

/** Approval, intro, button label, booking link and visibility for one mode. */
export async function saveMode(fd: FormData) {
  const { profile } = await requireOwner();
  const mode = String(fd.get("mode"));
  if (!(MODES as readonly string[]).includes(mode)) return;
  await db.modeConfig.updateMany({
    where: { profileId: profile.id, mode },
    data: {
      ctaLabel: String(fd.get("cta")).trim().slice(0, 60),
      intro: String(fd.get("intro") ?? "").trim().slice(0, 240),
      requireApproval: fd.get("approval") === "on",
      bookingUrl: String(fd.get("url")).trim(),
      isEnabled: mode === "ALL" ? true : fd.get("on") !== "off",
    },
  });
  revalidatePath("/app", "layout");
  if (fd.get("ret") === "kit") redirect(`/app/profile/kit?mode=${mode}&tab=actions&saved=1`);
  redirect(`/app/settings?mode=${mode}&saved=1`);
}
