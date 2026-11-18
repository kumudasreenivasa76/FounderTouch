/**
 * Demo pictures and people for the demo account. Safe to run on every start:
 * it only fills in what is missing, and never touches anyone else's data.
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import { MODES, MODE_INFO } from "../lib/modes";
import { putUpload } from "../lib/storage";

const db = new PrismaClient();
const DIR = path.join(__dirname, "demo");

async function upload(file: string, as: string) {
  await putUpload(as, await readFile(path.join(DIR, file)), "image/jpeg");
  return as;
}

const PEOPLE = [
  { handle: "maya", first: "Maya", last: "Iyer", headline: "Founder & CEO", company: "Northwind Health", theme: "indigo", photo: "maya.jpg", modes: ["FOUNDER"], fields: { FOUNDER: { stage: "Seed", raising: "$1.5M", users: "1,200", milestones: "Pilot with 3 clinics\nHIPAA audit passed" } } },
  { handle: "arjun", first: "Arjun", last: "Mehta", headline: "Partner", company: "Orbit Ventures", theme: "midnight", photo: "arjun.jpg", modes: ["INVESTOR"], fields: { INVESTOR: { type: "VC", focus: "FinTech\nSaaS\nAI / ML", stages: "Seed\nSeries A", ticket: "$250k+", portfolio: "Ledgerly\nCampus Loop" } } },
  { handle: "kavya", first: "Kavya", last: "Rao", headline: "Owner", company: "Kiln & Co. Ceramics", theme: "sunset", photo: "kavya.jpg", modes: ["SERVICES"], fields: { SERVICES: { industry: "Handmade ceramics", services: "Tableware\nCustom gifting\nWorkshops", delivery: "Pan-India" } } },
  { handle: "leah", first: "Leah", last: "Okafor", headline: "Product designer", company: "", theme: "emerald", photo: "leah.jpg", modes: ["NORMAL"], fields: {} },
  { handle: "ishaan", first: "Ishaan", last: "Verma", headline: "Full-stack engineer", company: "", theme: "ocean", photo: "ishaan.jpg", modes: ["NORMAL"], fields: {} },
  { handle: "anita", first: "Anita", last: "Desai", headline: "Talent lead", company: "BuildLab", theme: "rose", photo: "anita.jpg", modes: ["RECRUITER"], fields: { RECRUITER: { workType: "Hybrid", locations: "Bengaluru", perks: "Health cover\nESOPs\nLearning budget" } } },
  { handle: "rahul", first: "Rahul", last: "Mehta", headline: "Managing partner", company: "Peak Ventures", theme: "midnight", photo: "rahul.jpg", modes: ["INVESTOR"], fields: { INVESTOR: { type: "VC", focus: "HealthTech\nClimate", stages: "Seed", ticket: "$500k+" } } },
] as const;

async function main() {
  const demo = await db.profile.findUnique({ where: { handle: "demo" } });
  if (!demo) return;

  // The demo founder's own photo.
  if (!demo.photo) await db.profile.update({ where: { id: demo.id }, data: { photo: await upload("alex.jpg", "photo-demo-alex.jpg") } });

  // People to discover and connect with.
  for (const x of PEOPLE) {
    if (await db.profile.findUnique({ where: { handle: x.handle } })) {
      const p = await db.profile.findUnique({ where: { handle: x.handle } });
      if (p && !p.photo) await db.profile.update({ where: { id: p.id }, data: { photo: await upload(x.photo, `photo-demo-${x.handle}.jpg`) } });
      continue;
    }
    const email = `${x.handle}@demo.tapnodd.example`;
    if (await db.user.findUnique({ where: { email } })) continue;
    const salt = randomBytes(16).toString("hex");
    const name = `${x.first} ${x.last}`;
    const u = await db.user.create({ data: { email, name, firstName: x.first, lastName: x.last, passwordHash: salt + ":" + scryptSync(randomBytes(24).toString("hex"), salt, 32).toString("hex") } });
    const p = await db.profile.create({ data: { userId: u.id, handle: x.handle, name, firstName: x.first, lastName: x.last, headline: x.headline, company: x.company, theme: x.theme, photo: await upload(x.photo, `photo-demo-${x.handle}.jpg`) } });
    for (const m of MODES) {
      const on = m === "ALL" || (x.modes as readonly string[]).includes(m);
      const f = (x.fields as Record<string, Record<string, string>>)[m];
      await db.modeConfig.create({ data: { profileId: p.id, mode: m, isEnabled: on, sectionIds: "[]", ctaLabel: MODE_INFO[m].cta, fields: f ? JSON.stringify(f) : "{}" } });
      await db.shareLink.create({ data: { profileId: p.id, mode: m, token: randomBytes(6).toString("hex") } });
    }
  }

  // Product pictures for the demo catalog.
  const pics: Record<string, string> = { "Lumen Vision starter kit": "product-kit.jpg", "Line audit (on site)": "product-audit.jpg", "Extra camera": "product-camera.jpg" };
  for (const pr of await db.product.findMany({ where: { profileId: demo.id, image: "" } })) {
    const file = pics[pr.name];
    if (file) await db.product.update({ where: { id: pr.id }, data: { image: await upload(file, `product-demo-${pr.id}.jpg`) } });
  }

  // An upcoming event with a cover photo.
  if (!(await db.event.findFirst({ where: { profileId: demo.id, slug: "founder-summit-demo" } }))) {
    const starts = new Date(Date.now() + 9 * 86400_000); starts.setHours(18, 0, 0, 0);
    await db.event.create({ data: { profileId: demo.id, slug: "founder-summit-demo", name: "Founder Summit 2026", location: "Bengaluru", startsAt: starts, endsAt: new Date(starts.getTime() + 3 * 3600_000), summary: "Pitches, investor office hours and hiring tables.", cover: await upload("event.jpg", "event-demo-summit.jpg") } });
  }
  for (const e of await db.event.findMany({ where: { profileId: demo.id, cover: "" } })) {
    await db.event.update({ where: { id: e.id }, data: { cover: await upload("event.jpg", `event-demo-${e.id}.jpg`) } });
  }
}

main().catch((e) => { console.error("demo extras skipped:", e?.message ?? e); }).finally(() => db.$disconnect());
