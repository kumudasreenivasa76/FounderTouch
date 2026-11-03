"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { MODES } from "@/lib/modes";

const done = (fd?: FormData) => {
  revalidatePath("/app/nfc");
  const m = String(fd?.get("ret") ?? "");
  if (/^[A-Z]+$/.test(m)) { revalidatePath("/app/profile/kit"); redirect(`/app/profile/kit?mode=${m}&tab=share&saved=1`); }
  redirect("/app/nfc?saved=1");
};

async function mine(id: FormDataEntryValue | null) {
  const { profile } = await requireOwner();
  const tag = await db.nfcTag.findFirst({ where: { id: String(id), profileId: profile.id } });
  if (!tag) redirect("/app/nfc");
  return tag;
}

export async function addTag(fd: FormData) {
  const { profile } = await requireOwner();
  const rm = String(fd.get("ret") ?? "");
  await db.nfcTag.create({ data: { ...((MODES as readonly string[]).includes(rm) ? { mode: rm } : {}), profileId: profile.id, nickname: String(fd.get("nickname") ?? "").trim().slice(0, 40) || "My tag", token: randomBytes(12).toString("hex") } });
  done(fd);
}

/** Change which mode a tag opens. The owner and the mode are checked on the server. */
export async function saveTag(fd: FormData) {
  const tag = await mine(fd.get("id"));
  const mode = String(fd.get("mode"));
  if (!(MODES as readonly string[]).includes(mode)) return;
  await db.nfcTag.update({
    where: { id: tag.id },
    data: {
      mode, nickname: String(fd.get("nickname") ?? "").trim().slice(0, 40) || tag.nickname,
      fallback: fd.get("fallback") === "UNAVAILABLE" ? "UNAVAILABLE" : "HUB", enabled: fd.get("enabled") === "on",
    },
  });
  done(fd);
}

/** Lost tag: issue a fresh token so the old URL stops working. */
export async function resetTag(fd: FormData) {
  const tag = await mine(fd.get("id"));
  await db.nfcTag.update({ where: { id: tag.id }, data: { token: randomBytes(12).toString("hex") } });
  done(fd);
}

export async function deleteTag(fd: FormData) {
  const tag = await mine(fd.get("id"));
  await db.nfcTag.delete({ where: { id: tag.id } });
  done(fd);
}
