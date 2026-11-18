import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "crypto";
const db = new PrismaClient();
import { MODES, MODE_INFO } from "../lib/modes";
async function main() {
  await db.profile.deleteMany(); await db.user.deleteMany();
  const salt = randomBytes(16).toString("hex");
  const u = await db.user.create({ data: { email: "demo@founder.example", name: "Alex Rao", passwordHash: salt + ":" + scryptSync("demo1234", salt, 32).toString("hex") } });
  const p = await db.profile.create({ data: { userId: u.id, company: "Lumen Labs", handle: "demo", name: "Alex Rao", headline: "Founder, Lumen Labs", bio: "Building AI tools for small manufacturers." } });
  const mk = (type: string, title: string, body: string, order: number) => db.section.create({ data: { profileId: p.id, type, title, body, order } });
  const s = {
    about: await mk("about", "About", "Second-time founder. Previously ops at a Tier-1 auto supplier.", 0),
    products: await mk("products", "Products", "Lumen Vision: defect detection that runs on a $200 camera.", 1),
    traction: await mk("traction", "Traction", "14 paying plants, $38k MRR, 9% MoM growth.", 2),
    pricing: await mk("pricing", "Pricing", "From $400/plant/month. 30-day pilot.", 3),
    project: await mk("project", "Hackathon project", "Realtime line-stop alerts built in 24h.", 4),
    team: await mk("team", "Team", "5 people: 3 eng, 1 design, 1 ops.", 5),
  };
  const sel: Record<string, string[]> = {
    FOUNDER: [s.about, s.products, s.team], SERVICES: [s.about, s.products, s.pricing], CUSTOMER: [s.products, s.pricing],
    INVESTOR: [s.about, s.traction, s.team], ALL: Object.values(s),
  } as any;
    for (const m of MODES) {
    await db.modeConfig.create({ data: { profileId: p.id, mode: m, sectionIds: JSON.stringify((sel[m] ?? []).map((x: any) => x.id)), ctaLabel: MODE_INFO[m].cta } });
    await db.shareLink.create({ data: { profileId: p.id, mode: m, token: randomBytes(6).toString("hex") } });
  }
  // Each persona's own details, so every mode page has something to show.
  const fields: Record<string, Record<string, string>> = {
    FOUNDER: { stage: "Seed", raising: "$1.2M", round: "Seed", users: "14 plants", revenue: "$38k MRR", traction: "14 paying plants, 9% month on month", useOfFunds: "Sales in Pune and Chennai, and a second model for welding defects.", milestones: "MVP launched\n14 paying plants\nFirst enterprise pilot" },
    INVESTOR: { type: "Angel", focus: "HealthTech\nAI / ML\nFinTech\nClimate", stages: "Pre-seed\nSeed", ticket: "$25k+", portfolio: "Goicure\nUnimonk\nMedAxis", howToPitch: "Send a short note and your deck link. I reply within a week." },
    SERVICES: { industry: "Industrial vision", services: "Starter kits\nLine audits\nCustom models", delivery: "7 days" },
  };
  for (const [mode, f] of Object.entries(fields)) await db.modeConfig.updateMany({ where: { profileId: p.id, mode }, data: { fields: JSON.stringify(f) } });
  await db.product.createMany({ data: [
    { profileId: p.id, name: "Lumen Vision starter kit", price: "Rs 16,500", description: "Camera, mount and 3 months of defect detection", order: 1 },
    { profileId: p.id, name: "Line audit (on site)", price: "Rs 45,000", description: "Two-day audit of one production line", order: 2 },
    { profileId: p.id, name: "Extra camera", price: "Rs 9,800", description: "Add another station to an existing kit", order: 3 },
  ] });
  await db.deal.createMany({ data: [
    { profileId: p.id, company: "Northwind Health", founder: "Maya Iyer", email: "maya@northwind.example", round: "Seed", amount: "$1.2M", note: "Clinic scheduling, 1,200 users", stage: "NEW" },
    { profileId: p.id, company: "Campus Loop", founder: "Ravi Iyer", email: "ravi@campusloop.example", round: "Pre-seed", amount: "$400k", note: "Campus marketplace", stage: "REVIEW" },
    { profileId: p.id, company: "Ledgerly", founder: "Neha Rao", email: "neha@ledgerly.example", round: "Seed", amount: "$800k", note: "Books for small clinics", stage: "TERM_SHEET" },
  ] });
}
main().then(() => db.$disconnect());
