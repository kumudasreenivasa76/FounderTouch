"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { endSession, requireOwner } from "@/lib/auth";
import { KINDS, MAX_UPLOAD } from "@/lib/kinds";
import { MODES, MODE_INFO, Mode } from "@/lib/modes";
import { cleanTags } from "@/lib/tags";
import { socialsFromForm, socialUrl } from "@/lib/socials";

const UPLOADS = () => path.join(process.cwd(), "uploads");
const ROUTES: Record<string, string> = { basic: "details", contact: "contact", company: "company", kit: "kit", work: "work" };
/** Back to a profile screen, optionally with a banner flag like "&saved=1". */
const go: (screen: string, extra?: string) => never = (screen, extra = "") => redirect(`/app/profile/${ROUTES[screen]}${extra ? "?" + extra.slice(1) : ""}`);
const done = () => revalidatePath("/app", "layout");
const withHttp = (u: string) => (u && !/^https?:\/\//i.test(u) ? "https://" + u : u);

export async function saveDetails(fd: FormData) {
  const { profile } = await requireOwner();
  let photo = profile.photo;
  const f = fd.get("photo") as File | null;
  if (f && f.size > 0) {
    const ext = path.extname(f.name).toLowerCase();
    if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext) || f.size > 5 * 1024 * 1024) go("basic", "&err=photo");
    photo = "photo-" + randomBytes(8).toString("hex") + ext;
    await mkdir(UPLOADS(), { recursive: true });
    await writeFile(path.join(UPLOADS(), photo), Buffer.from(await f.arrayBuffer()));
    if (profile.photo) await unlink(path.join(UPLOADS(), path.basename(profile.photo))).catch(() => {});
  }
  const firstName = String(fd.get("firstName")).trim(), lastName = String(fd.get("lastName")).trim();
  await db.profile.update({
    where: { id: profile.id },
    data: { photo, firstName, lastName, name: `${firstName} ${lastName}`.trim(), headline: String(fd.get("headline")).trim(), bio: String(fd.get("bio")).trim() },
  });
  done();
  go("basic", "&saved=1");
}

export async function uploadPhoto(fd: FormData) {
  const { profile } = await requireOwner();
  const f = fd.get("photo") as File | null;
  if (!f || f.size === 0) return;
  const ext = path.extname(f.name).toLowerCase();
  if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext) || f.size > 5 * 1024 * 1024) return;
  const photo = "photo-" + randomBytes(8).toString("hex") + ext;
  await mkdir(UPLOADS(), { recursive: true });
  await writeFile(path.join(UPLOADS(), photo), Buffer.from(await f.arrayBuffer()));
  if (profile.photo) await unlink(path.join(UPLOADS(), path.basename(profile.photo))).catch(() => {});
  await db.profile.update({ where: { id: profile.id }, data: { photo } });
  done();
}

export async function removePhoto() {
  const { profile } = await requireOwner();
  if (profile.photo) await unlink(path.join(UPLOADS(), path.basename(profile.photo))).catch(() => {});
  await db.profile.update({ where: { id: profile.id }, data: { photo: "" } });
  done();
  go("basic", "&saved=1");
}

export async function saveContact(fd: FormData) {
  const { profile } = await requireOwner();
  await db.profile.update({
    where: { id: profile.id },
    data: { phone: String(fd.get("phone")).trim(), email: String(fd.get("email")).trim(), website: withHttp(String(fd.get("website") ?? "").trim()), socials: socialsFromForm(fd) },
  });
  done();
  go("contact", "&saved=1");
}

export async function saveCompany(fd: FormData) {
  const { profile } = await requireOwner();
  await db.profile.update({
    where: { id: profile.id },
    data: { company: String(fd.get("company")).trim() },
  });
  done();
  go("company", "&saved=1");
}

export async function addMember(fd: FormData) {
  const { profile } = await requireOwner();
  const username = String(fd.get("username")).trim().replace(/^@/, "").toLowerCase();
  const order = await db.teamMember.count({ where: { profileId: profile.id } });
  if (username) {
    const m = await db.profile.findUnique({ where: { handle: username } });
    if (!m) go("company", "&err=nouser");
    if (m.id === profile.id) go("company", "&err=self");
    const dup = await db.teamMember.findFirst({ where: { profileId: profile.id, memberHandle: m.handle } });
    if (!dup) await db.teamMember.create({ data: { profileId: profile.id, name: m.name, role: String(fd.get("role")).trim() || m.headline, link: `/${m.handle}`, memberHandle: m.handle, order } });
  } else {
    const name = String(fd.get("name")).trim();
    if (!name) go("company", "&err=member");
    await db.teamMember.create({ data: { profileId: profile.id, name, role: String(fd.get("role")).trim(), link: socialUrl("portfolio", String(fd.get("link"))), order } });
  }
  done();
  go("company", "&saved=1");
}

export async function delMember(fd: FormData) {
  const { profile } = await requireOwner();
  await db.teamMember.deleteMany({ where: { id: String(fd.get("id")), profileId: profile.id } });
  done();
}

/** Kits ticked on a form (falls back to the kit being edited). */
const pickModes = (fd: FormData, fallback: string) => {
  const m = fd.getAll("modes").map(String).filter((x) => (MODES as readonly string[]).includes(x));
  return (m.length ? m : [fallback]).join(",");
};
const kitMode = (v: FormDataEntryValue | null) => ((MODES as readonly string[]).includes(String(v)) ? String(v) : "FOUNDER");

export async function saveKitText(fd: FormData) {
  const { profile } = await requireOwner();
  const mode = kitMode(fd.get("kmode")) as Mode;
  const text = String(fd.get("kitText") ?? "").trim().slice(0, 1500);
  // Only this mode's own fields are kept, trimmed and capped.
  const fields: Record<string, string> = {};
  for (const f of MODE_INFO[mode].fields) {
    let v = String(fd.get("f_" + f.key) ?? "").trim().slice(0, f.type === "textarea" ? 1200 : 600);
    if (f.type === "url" && v && !/^https?:\/\//i.test(v)) v = "https://" + v;
    if (f.type === "select" && !(f.options ?? []).includes(v)) v = "";
    if (v) fields[f.key] = v;
  }
  await db.modeConfig.updateMany({ where: { profileId: profile.id, mode }, data: { kitText: text, fields: JSON.stringify(fields) } });
  if (mode === "FOUNDER") await db.profile.update({ where: { id: profile.id }, data: { product: text } });
  done();
  go("kit", `&mode=${mode}&saved=1`);
}

export async function addResource(fd: FormData) {
  const { profile } = await requireOwner();
  const kind = String(fd.get("kind"));
  const kmode = kitMode(fd.get("kmode"));
  const back = String(fd.get("ret")) === "work" ? "work" : "kit";
  if (!(kind in KINDS)) return;
  const url = String(fd.get("url")).trim();
  if (url && !/^https?:\/\//i.test(url)) go(back, `&mode=${kmode}&err=url&kind=${kind}`);
  const file = fd.get("file") as File | null;
  let filePath = "", mime = "";
  if (file && file.size > 0) {
    if (file.size > MAX_UPLOAD) go(back, `&mode=${kmode}&err=size&kind=${kind}`);
    const ext = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, "").slice(0, 8);
    filePath = randomBytes(10).toString("hex") + ext;
    mime = file.type;
    await mkdir(UPLOADS(), { recursive: true });
    await writeFile(path.join(UPLOADS(), filePath), Buffer.from(await file.arrayBuffer()));
  }
  if (!url && !filePath) go(back, `&mode=${kmode}&err=empty&kind=${kind}`);
  const title = String(fd.get("title")).trim() || (file?.name && file.size > 0 ? file.name : KINDS[kind]);
  await db.resource.create({ data: { profileId: profile.id, kind, title, url, filePath, mime, gated: fd.get("gated") === "on", modes: pickModes(fd, kmode), tags: cleanTags(String(fd.get("tags") ?? "")) } });
  done();
  go(back, `&mode=${kmode}&saved=1`);
}

export async function setResourceModes(fd: FormData) {
  const { profile } = await requireOwner();
  const kmode = kitMode(fd.get("kmode"));
  await db.resource.updateMany({ where: { id: String(fd.get("id")), profileId: profile.id }, data: { modes: pickModes(fd, kmode) } });
  done();
  go("kit", `&mode=${kmode}&saved=1`);
}

export async function delResource(fd: FormData) {
  const { profile } = await requireOwner();
  const r = await db.resource.findFirst({ where: { id: String(fd.get("id")), profileId: profile.id } });
  if (!r) return;
  await db.resource.delete({ where: { id: r.id } });
  if (r.filePath) await unlink(path.join(UPLOADS(), path.basename(r.filePath))).catch(() => {});
  done();
}

export async function logout() {
  await endSession();
  redirect("/login");
}

