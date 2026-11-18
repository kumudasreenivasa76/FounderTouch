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
  let handle = slug(name) || "me";
  const RESERVED = ["app", "e", "s", "t", "a", "n", "files", "photo", "logo", "login", "signup", "onboarding", "welcome", "verify", "api", "demo", "dashboard", "company", "auth", "admin", "offline", "event-img", "applicant-file"];
  while (RESERVED.includes(handle) || (await db.profile.findUnique({ where: { handle } }))) handle = `${handle.slice(0, 24)}-${randomBytes(2).toString("hex")}`;
  const str = (k: string) => String(fd.get(k) ?? "").trim();
  const headline = str("headline"), company = str("company"), bio = str("bio");
  const url = str("url");
  const picked = new Set(fd.getAll("modes").map(String));
  const kits = new Set(fd.getAll("kits").map(String));
  const web = (v: string) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v);

  const p = await db.profile.create({ data: {
    userId: u.id, handle, name, firstName, lastName, headline, company, bio, phone: str("phone"), socials: socialsFromForm(fd),
    email: str("email"), website: web(str("website") || str("companyWebsite")), industry: str("industry"), companySize: str("companySize"),
  } });
  const ids: string[] = [];
  for (const m of MODES) {
    await db.modeConfig.create({ data: { profileId: p.id, mode: m, sectionIds: JSON.stringify(ids), bookingUrl: url, ctaLabel: MODE_INFO[m].cta, isEnabled: m === "ALL" || m === "NORMAL" || picked.has(m) || kits.has(m), added: kits.has(m) } });
    await db.shareLink.create({ data: { profileId: p.id, mode: m, token: randomBytes(6).toString("hex") } });
  }
  redirect("/app");
}

export default async function Onboarding() {
  const u = await currentUser();
  if (!u) redirect("/login");
  if (!u.emailVerified) redirect("/verify");
  if (u.profile) redirect("/app");
  return <Wizard firstName={u.firstName} lastName={u.lastName} email={u.email} finish={finish} modes={MODES.filter((m) => m !== "ALL")} />;
}
