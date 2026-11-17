"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { MODES, MAX_MODE_LINKS, cleanLink } from "@/lib/modes";
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
  // Extra buttons are only touched when the form that was submitted has the link rows on it.
  let links: string | undefined;
  if (fd.get("hasLinks") === "1") {
    const labels = fd.getAll("linkLabel").map(String), urls = fd.getAll("linkUrl").map(String);
    const out: { label: string; url: string }[] = [];
    for (let i = 0; i < urls.length && out.length < MAX_MODE_LINKS; i++) {
      const url = cleanLink(urls[i]).slice(0, 500);
      if (!url) continue;
      const label = (labels[i] ?? "").trim().slice(0, 40) || url.replace(/^(https?:\/\/(www\.)?|mailto:|tel:)/i, "").split(/[/?#]/)[0];
      out.push({ label, url });
    }
    links = JSON.stringify(out);
  }
  const rawUrl = String(fd.get("url") ?? "").trim();
  await db.modeConfig.updateMany({
    where: { profileId: profile.id, mode },
    data: {
      ctaLabel: String(fd.get("cta")).trim().slice(0, 60),
      intro: String(fd.get("intro") ?? "").trim().slice(0, 240),
      requireApproval: fd.get("approval") === "on",
      bookingUrl: rawUrl && !/^https?:\/\//i.test(rawUrl) && /^[\w-]+(\.[\w-]+)+/.test(rawUrl) ? "https://" + rawUrl : rawUrl,
      isEnabled: mode === "ALL" ? true : fd.get("on") !== "off",
      ...(links !== undefined ? { links } : {}),
    },
  });
  revalidatePath("/app", "layout");
  if (fd.get("ret") === "kit") redirect(mode !== "ALL" && fd.get("on") === "off" ? "/app/profile/kit?mode=ADD" : `/app/profile/kit?mode=${mode}&tab=actions&saved=1`);
  redirect(`/app/settings?mode=${mode}&saved=1`);
}
