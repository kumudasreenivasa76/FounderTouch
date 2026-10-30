"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { MODES } from "@/lib/modes";
import { OPEN_TO, validDate } from "@/lib/career";

const done = () => revalidatePath("/app", "layout");
const back = (q = "") => redirect(`/app/profile/work${q}`);

export async function saveHire(fd: FormData) {
  const { profile } = await requireOwner();
  const openTo = String(fd.get("openTo") ?? "");
  const modes = fd.getAll("modes").map(String).filter((m) => (MODES as readonly string[]).includes(m) && m !== "ALL");
  await db.profile.update({
    where: { id: profile.id },
    data: { openTo: (OPEN_TO as readonly string[]).includes(openTo) ? openTo : "", skills: String(fd.get("skills") ?? "").trim().slice(0, 600), hireModes: modes.join(",") },
  });
  done();
  back("?saved=1");
}

export async function addCareer(fd: FormData) {
  const { profile } = await requireOwner();
  const type = String(fd.get("type")) === "EDUCATION" ? "EDUCATION" : "EXPERIENCE";
  const title = String(fd.get("title")).trim(), org = String(fd.get("org")).trim();
  if (!title || !org) back(`?err=${type === "EDUCATION" ? "edu" : "exp"}`);
  const current = fd.get("current") === "on";
  await db.careerItem.create({
    data: {
      profileId: profile.id, type, title: title.slice(0, 120), org: org.slice(0, 120), location: String(fd.get("location") ?? "").trim().slice(0, 80),
      start: validDate(String(fd.get("start") ?? "").trim()), end: current ? "" : validDate(String(fd.get("end") ?? "").trim()),
      description: String(fd.get("description") ?? "").trim().slice(0, 1200),
    },
  });
  done();
  back("?saved=1");
}

export async function delCareer(fd: FormData) {
  const { profile } = await requireOwner();
  await db.careerItem.deleteMany({ where: { id: String(fd.get("id")), profileId: profile.id } });
  done();
}

/** Open to work: on keeps your chosen kind of availability (or sets "Open to work"), off hides the badge. */
export async function setOpenToWork(fd: FormData) {
  const { profile } = await requireOwner();
  const on = fd.get("on") === "1";
  const keep = profile.openTo && profile.openTo !== "Not looking" ? profile.openTo : "Open to work";
  await db.profile.update({ where: { id: profile.id }, data: { openTo: on ? keep : "" } });
  done();
  back();
}

/** Show or hide the whole Hire me page for visitors. Nothing is deleted. */
export async function setHireVisible(fd: FormData) {
  const { profile } = await requireOwner();
  await db.modeConfig.updateMany({ where: { profileId: profile.id, mode: "HIRE" }, data: { isEnabled: fd.get("on") === "1" } });
  done();
  back();
}
