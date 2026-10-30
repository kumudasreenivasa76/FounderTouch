import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { MODES, MODE_INFO } from "@/lib/modes";
import { currentUser } from "@/lib/auth";
import Wizard from "./wizard";
import { socialsFromForm } from "@/lib/socials";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);

async function finish(fd: FormData) {
  "use server";
  const u = await currentUser();
  if (!u) redirect("/login");
  if (u.profile) redirect("/app");
  const firstName = String(fd.get("firstName")).trim() || u.firstName, lastName = String(fd.get("lastName")).trim() || u.lastName;
  const name = `${firstName} ${lastName}`.trim() || u.name;
  let handle = slug(String(fd.get("handle"))) || slug(name) || "me";
  const RESERVED = ["app", "e", "s", "t", "files", "photo", "login", "signup", "onboarding", "api", "demo"];
  while (RESERVED.includes(handle) || (await db.profile.findUnique({ where: { handle } }))) handle = `${handle.slice(0, 24)}-${randomBytes(2).toString("hex")}`;
  const headline = String(fd.get("headline")).trim(), company = String(fd.get("company")).trim(), bio = String(fd.get("bio")).trim();
  const url = String(fd.get("url")).trim();
  const picked = new Set(fd.getAll("modes").map(String));

  const p = await db.profile.create({ data: { userId: u.id, handle, name, firstName, lastName, headline, company, bio, phone: String(fd.get("phone")).trim(), socials: socialsFromForm(fd) } });
  const about = await db.section.create({ data: { profileId: p.id, type: "about", title: "About", body: bio || `Hi, I'm ${name}.`, order: 0 } });
  const ids = [about.id];
  if (company) ids.push((await db.section.create({ data: { profileId: p.id, type: "company", title: "Company", body: `${company}${headline ? " · " + headline : ""}`, order: 1 } })).id);
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
