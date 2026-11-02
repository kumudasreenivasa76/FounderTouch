import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { MODES, MODE_INFO } from "@/lib/modes";
import { currentUser } from "@/lib/auth";
import Wizard from "./wizard";
import { socialsFromForm } from "@/lib/socials";
import { freeHandle } from "@/lib/platform";


async function finish(fd: FormData) {
  "use server";
  const u = await currentUser();
  if (!u) redirect("/login");
  if (u.profile) redirect("/app");
  const firstName = String(fd.get("firstName")).trim() || u.firstName, lastName = String(fd.get("lastName")).trim() || u.lastName;
  const name = `${firstName} ${lastName}`.trim() || u.name;
  const handle = await freeHandle(String(fd.get("handle")), name);
  const headline = String(fd.get("headline")).trim(), company = String(fd.get("company")).trim(), bio = String(fd.get("bio")).trim();
  const url = String(fd.get("url")).trim();
  const picked = new Set(fd.getAll("modes").map(String));

  const p = await db.profile.create({ data: { userId: u.id, handle, name, firstName, lastName, headline, company, bio, phone: String(fd.get("phone")).trim(), socials: socialsFromForm(fd) } });
  const ids: string[] = [];
  for (const m of MODES) {
    await db.modeConfig.create({ data: { profileId: p.id, mode: m, sectionIds: JSON.stringify(ids), bookingUrl: url, ctaLabel: MODE_INFO[m].cta, isEnabled: m === "ALL" || picked.has(m) } });
    await db.shareLink.create({ data: { profileId: p.id, mode: m, token: randomBytes(6).toString("hex") } });
  }
  redirect("/app");
}

export default async function Onboarding() {
  const u = await currentUser();
  if (!u) redirect("/login");
  if (u.profile) redirect("/app");
  return <Wizard firstName={u.firstName} lastName={u.lastName} finish={finish} modes={MODES.filter((m) => m !== "ALL")} />;
}
