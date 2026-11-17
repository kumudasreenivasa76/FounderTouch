"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { cleanLink } from "@/lib/modes";
import { LINK_THEMES, hiddenAuto } from "@/lib/link-page";

const MAX_ITEMS = 40;

function back(qs: string): never {
  revalidatePath("/app/links");
  redirect(`/app/links?${qs}`);
}

/** The item, only if it belongs to the signed-in owner. */
async function own(id: FormDataEntryValue | null) {
  const { profile } = await requireOwner();
  const link = await db.bioLink.findFirst({ where: { id: String(id), profileId: profile.id } });
  return { profile, link };
}

/** A fallback title from the address, e.g. "example.com". */
const titleFrom = (url: string) => url.replace(/^(https?:\/\/(www\.)?|mailto:|tel:)/i, "").split(/[/?#]/)[0];

async function nextOrder(profileId: string) {
  if ((await db.bioLink.count({ where: { profileId } })) >= MAX_ITEMS) back("err=max");
  const last = await db.bioLink.findFirst({ where: { profileId }, orderBy: { order: "desc" } });
  return (last?.order ?? 0) + 1;
}

export async function addLink(fd: FormData) {
  const { profile } = await requireOwner();
  const url = cleanLink(String(fd.get("url") ?? "")).slice(0, 500);
  if (!url) back("err=url");
  const order = await nextOrder(profile.id);
  const title = String(fd.get("title") ?? "").trim().slice(0, 60) || titleFrom(url);
  await db.bioLink.create({ data: { profileId: profile.id, kind: "LINK", title, url, order } });
  back("saved=1");
}

/** A heading that groups the links under it, e.g. "Work" or "Social". */
export async function addHeading(fd: FormData) {
  const { profile } = await requireOwner();
  const title = String(fd.get("title") ?? "").trim().slice(0, 60);
  if (!title) back("err=heading");
  const order = await nextOrder(profile.id);
  await db.bioLink.create({ data: { profileId: profile.id, kind: "HEADER", title, url: "", order } });
  back("saved=1");
}

export async function saveLink(fd: FormData) {
  const { link } = await own(fd.get("id"));
  if (!link) back("err=gone");
  const rawTitle = String(fd.get("title") ?? "").trim().slice(0, 60);
  if (link!.kind === "HEADER") {
    if (!rawTitle) back("err=heading");
    await db.bioLink.update({ where: { id: link!.id }, data: { title: rawTitle } });
    back("saved=1");
  }
  const url = cleanLink(String(fd.get("url") ?? "")).slice(0, 500);
  if (!url) back("err=url");
  await db.bioLink.update({ where: { id: link!.id }, data: { title: rawTitle || titleFrom(url), url } });
  back("saved=1");
}

export async function toggleLink(fd: FormData) {
  const { link } = await own(fd.get("id"));
  if (!link) back("err=gone");
  await db.bioLink.update({ where: { id: link!.id }, data: { enabled: !link!.enabled } });
  back("saved=1");
}

/** Makes this the highlighted link (only one at a time), or clears the highlight if it already is. */
export async function featureLink(fd: FormData) {
  const { profile, link } = await own(fd.get("id"));
  if (!link || link.kind !== "LINK") back("err=gone");
  await db.$transaction([
    db.bioLink.updateMany({ where: { profileId: profile.id, featured: true }, data: { featured: false } }),
    ...(link!.featured ? [] : [db.bioLink.update({ where: { id: link!.id }, data: { featured: true } })]),
  ]);
  back("saved=1");
}

/** Swaps this item with its neighbour above or below. */
export async function moveLink(fd: FormData) {
  const { profile, link } = await own(fd.get("id"));
  if (!link) back("err=gone");
  const up = fd.get("dir") === "up";
  const other = await db.bioLink.findFirst({
    where: { profileId: profile.id, order: up ? { lt: link!.order } : { gt: link!.order } },
    orderBy: { order: up ? "desc" : "asc" },
  });
  if (other) {
    await db.$transaction([
      db.bioLink.update({ where: { id: link!.id }, data: { order: other.order } }),
      db.bioLink.update({ where: { id: other.id }, data: { order: link!.order } }),
    ]);
  }
  back("saved=1");
}

export async function deleteLink(fd: FormData) {
  const { link } = await own(fd.get("id"));
  if (link) await db.bioLink.delete({ where: { id: link.id } });
  back("saved=1");
}

/** One of the ready-made looks. */
export async function setLinkTheme(fd: FormData) {
  const { profile } = await requireOwner();
  const theme = String(fd.get("theme"));
  if (!LINK_THEMES.some((t) => t.key === theme)) back("err=theme");
  await db.profile.update({ where: { id: profile.id }, data: { linkTheme: theme } });
  revalidatePath(`/${profile.handle}`);
  back("saved=1#look");
}

/** Shows or hides one of the buttons that come from the profile (booking link, website, a mode's page). */
export async function toggleAuto(fd: FormData) {
  const { profile } = await requireOwner();
  const key = String(fd.get("key"));
  if (!/^[A-Za-z]{1,20}$/.test(key)) back("err=gone");
  const hidden = hiddenAuto(profile.linkHidden);
  if (hidden.has(key)) hidden.delete(key); else hidden.add(key);
  await db.profile.update({ where: { id: profile.id }, data: { linkHidden: [...hidden].join(",") } });
  back("saved=1");
}

/** Lets search engines list this person's public pages, or asks them not to. */
export async function toggleSearchable() {
  const { profile } = await requireOwner();
  await db.profile.update({ where: { id: profile.id }, data: { searchable: !profile.searchable } });
  revalidatePath(`/${profile.handle}`);
  back("saved=1");
}
