"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { emit } from "@/lib/integrations";
import { logActivity } from "@/lib/activity";
import { parseCsv } from "@/lib/csv";
import { redirect } from "next/navigation";

const cleanTags = (v: string) => [...new Set(v.split(/[,\n]/).map((t) => t.trim().toLowerCase().replace(/[^a-z0-9 \-]/g, "").slice(0, 24)).filter(Boolean))].slice(0, 8).join(",");

/** Private note and follow-up date on one of your contacts. */
export async function saveContactNote(fd: FormData) {
  const { profile } = await requireOwner();
  const d = String(fd.get("followUpAt") ?? "");
  const when = d ? new Date(d) : null;
  await db.contact.updateMany({
    where: { id: String(fd.get("id")), profileId: profile.id },
    data: { notes: String(fd.get("notes") ?? "").trim().slice(0, 500), tags: cleanTags(String(fd.get("tags") ?? "")), followUpAt: when && !isNaN(when.getTime()) ? when : null },
  });
  revalidatePath("/app/contacts");
}

/** Accept, decline or block a connection request. Declined requests are removed; blocked ones stay so they cannot return. */
export async function decideConnection(fd: FormData) {
  const { profile } = await requireOwner();
  const id = String(fd.get("id")), choice = String(fd.get("choice"));
  const where = { id, profileId: profile.id };
  if (choice === "ACCEPT") {
    const c = await db.contact.findFirst({ where });
    await db.contact.updateMany({ where, data: { status: "CONNECTED" } });
    if (c) await logActivity(c.id, "accepted", "You accepted the connection");
    if (c) emit(profile.id, "contact.accepted", { name: c.name, email: c.email, company: c.company, mode: c.mode });
    if (c) await notify("connection_accepted", c.email, c.id, `${profile.name} accepted your connection`, `Hi ${c.name}, ${profile.name} accepted your request to connect.`);
  }
  else if (choice === "BLOCK") await db.contact.updateMany({ where, data: { status: "BLOCKED" } });
  else if (choice === "DECLINE") await db.contact.deleteMany({ where: { ...where, status: "PENDING" } });
  revalidatePath("/app/contacts");
}

/** Takes back access you approved: the link stops working on its next use. */
export async function revokeAccess(fd: FormData) {
  const { profile } = await requireOwner();
  const id = String(fd.get("id"));
  if (fd.get("kind") === "mode") await db.modeRequest.updateMany({ where: { id, profileId: profile.id, status: "APPROVED" }, data: { status: "REVOKED" } });
  else await db.deckRequest.updateMany({ where: { id, profileId: profile.id, status: "APPROVED" }, data: { status: "REVOKED" } });
  revalidatePath("/app/contacts");
}

/** Add someone you met without a scan (for example from a paper business card). */
export async function addContact(fd: FormData) {
  const { profile } = await requireOwner();
  const name = String(fd.get("name") ?? "").trim().slice(0, 80);
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) return;
  const had = await db.contact.findUnique({ where: { profileId_email: { profileId: profile.id, email } } });
  const saved = await db.contact.upsert({
    where: { profileId_email: { profileId: profile.id, email } },
    update: { lastInteractionAt: new Date(), interactions: { increment: 1 } },
    create: { profileId: profile.id, email, name, company: String(fd.get("company") ?? "").trim().slice(0, 80), mode: "ALL", source: "manual", status: "CONNECTED", notes: String(fd.get("notes") ?? "").trim().slice(0, 500), tags: cleanTags(String(fd.get("tags") ?? "")) },
  });
  await logActivity(saved.id, had ? "visit" : "created", had ? "Added again" : "Added by hand");
  revalidatePath("/app/contacts");
}


/* ---------- connection detail ---------- */
async function mine(id: FormDataEntryValue | null) {
  const { profile } = await requireOwner();
  const c = await db.contact.findFirst({ where: { id: String(id), profileId: profile.id } });
  if (!c) redirect("/app/contacts");
  return c;
}
const back = (id: string) => `/app/contacts/${id}`;
const touch = (id: string) => { revalidatePath("/app/contacts"); revalidatePath(back(id)); };

export async function toggleStar(fd: FormData) {
  const c = await mine(fd.get("id"));
  await db.contact.update({ where: { id: c.id }, data: { starred: !c.starred } });
  touch(c.id);
  redirect(String(fd.get("back") ?? "").startsWith("/app/contacts") ? String(fd.get("back")) : back(c.id));
}

export async function saveDetails(fd: FormData) {
  const c = await mine(fd.get("id"));
  const t = (k: string, n: number) => String(fd.get(k) ?? "").trim().slice(0, n);
  const li = t("linkedin", 200);
  await db.contact.update({ where: { id: c.id }, data: { name: t("name", 80) || c.name, company: t("company", 80), jobTitle: t("jobTitle", 80), phone: t("phone", 40), metAt: t("metAt", 120), linkedin: /^https?:\/\//i.test(li) || !li ? li : "https://" + li, tags: cleanTags(String(fd.get("tags") ?? "")), notes: t("notes", 1000) } });
  await logActivity(c.id, "edited", "Details updated");
  touch(c.id);
  redirect(back(c.id) + "?saved=1");
}

export async function addNote(fd: FormData) {
  const c = await mine(fd.get("id"));
  const text = String(fd.get("text") ?? "").trim().slice(0, 300);
  if (text) { await logActivity(c.id, "note", text); await db.contact.update({ where: { id: c.id }, data: { lastInteractionAt: new Date() } }); }
  touch(c.id);
  redirect(back(c.id));
}

/** Set a follow-up for a number of days from now (quick buttons) or for a chosen date. */
export async function setFollowUp(fd: FormData) {
  const c = await mine(fd.get("id"));
  const days = parseInt(String(fd.get("days") ?? ""), 10);
  let when: Date | null = null;
  if (days > 0 && days <= 365) { when = new Date(); when.setHours(9, 0, 0, 0); when.setDate(when.getDate() + days); }
  else if (fd.get("date")) { const d = new Date(String(fd.get("date")) + "T09:00:00"); if (!isNaN(d.getTime())) when = d; }
  await db.contact.update({ where: { id: c.id }, data: { followUpAt: when } });
  await logActivity(c.id, "followup", when ? `Follow-up set for ${when.toLocaleDateString("en-IN", { dateStyle: "medium" })}` : "Follow-up cleared");
  touch(c.id);
  redirect(String(fd.get("back") ?? "").startsWith("/app/contacts") ? String(fd.get("back")) : back(c.id));
}

/** You followed up: clears the reminder and records it. */
export async function markFollowedUp(fd: FormData) {
  const c = await mine(fd.get("id"));
  await db.contact.update({ where: { id: c.id }, data: { followUpAt: null, lastInteractionAt: new Date() } });
  await logActivity(c.id, "done", "Followed up");
  touch(c.id);
  redirect(String(fd.get("back") ?? "").startsWith("/app/contacts") ? String(fd.get("back")) : back(c.id));
}

export async function removeContact(fd: FormData) {
  const c = await mine(fd.get("id"));
  await db.contact.delete({ where: { id: c.id } });
  revalidatePath("/app/contacts");
  redirect("/app/contacts");
}

/* ---------- import ---------- */
/** Import a CSV (paste or upload). The first row names the columns: name, email, company, phone, title, tags. */
export async function importContacts(fd: FormData) {
  const { profile } = await requireOwner();
  const file = fd.get("file") as File | null;
  const text = (file && file.size > 0 && file.size < 1_000_000 ? await file.text() : String(fd.get("text") ?? "")).replace(/^\uFEFF/, "");
  const rows = parseCsv(text).slice(0, 501);
  if (rows.length < 2) redirect("/app/contacts/import?err=empty");
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const col = (...names: string[]) => head.findIndex((h) => names.includes(h));
  const iName = col("name", "full name"), iEmail = col("email", "e-mail", "email address"), iCo = col("company", "organization", "organisation"), iPhone = col("phone", "mobile", "phone number"), iTitle = col("title", "job title", "role"), iTags = col("tags", "tag");
  if (iEmail < 0) redirect("/app/contacts/import?err=columns");
  let added = 0, updated = 0, skipped = 0;
  for (const r of rows.slice(1)) {
    const email = (r[iEmail] ?? "").trim().toLowerCase();
    const name = ((iName >= 0 ? r[iName] : "") ?? "").trim() || email.split("@")[0];
    if (!/^\S+@\S+\.\S+$/.test(email)) { skipped++; continue; }
    const data = { name: name.slice(0, 80), company: ((iCo >= 0 ? r[iCo] : "") ?? "").trim().slice(0, 80), phone: ((iPhone >= 0 ? r[iPhone] : "") ?? "").trim().slice(0, 40), jobTitle: ((iTitle >= 0 ? r[iTitle] : "") ?? "").trim().slice(0, 80), tags: cleanTags((iTags >= 0 ? r[iTags] : "") ?? "") };
    const had = await db.contact.findUnique({ where: { profileId_email: { profileId: profile.id, email } } });
    const c = await db.contact.upsert({ where: { profileId_email: { profileId: profile.id, email } }, update: { ...data, lastInteractionAt: new Date() }, create: { profileId: profile.id, email, mode: "ALL", source: "import", status: "CONNECTED", ...data } });
    await logActivity(c.id, had ? "edited" : "created", had ? "Updated by import" : "Imported from a file");
    if (had) updated++; else added++;
  }
  revalidatePath("/app/contacts");
  redirect(`/app/contacts/import?done=1&added=${added}&updated=${updated}&skipped=${skipped}`);
}

/** The full add form: everything you know about someone you met without a scan. */
export async function addContactFull(fd: FormData) {
  const { profile } = await requireOwner();
  const t = (k: string, n: number) => String(fd.get(k) ?? "").trim().slice(0, n);
  const name = t("name", 80), email = t("email", 120).toLowerCase();
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) redirect("/app/contacts/new?err=1");
  const fu = fd.get("followUp") ? new Date(String(fd.get("followUp")) + "T09:00:00") : null;
  const data = { name, company: t("company", 80), jobTitle: t("jobTitle", 80), phone: t("phone", 40), metAt: t("metAt", 120), tags: cleanTags(String(fd.get("tags") ?? "")), followUpAt: fu && !isNaN(fu.getTime()) ? fu : null };
  const had = await db.contact.findUnique({ where: { profileId_email: { profileId: profile.id, email } } });
  const c = await db.contact.upsert({ where: { profileId_email: { profileId: profile.id, email } }, update: { ...data, lastInteractionAt: new Date() }, create: { profileId: profile.id, email, mode: "ALL", source: "manual", status: "CONNECTED", ...data } });
  await logActivity(c.id, had ? "edited" : "created", had ? "Updated" : `Added${data.metAt ? ", met at " + data.metAt : " by hand"}`);
  revalidatePath("/app/contacts");
  redirect(`/app/contacts/${c.id}`);
}
