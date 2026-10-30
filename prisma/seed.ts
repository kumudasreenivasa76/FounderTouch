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
    FOUNDER: [s.about, s.products, s.team], SELLER: [s.about, s.products, s.pricing], SERVICES: [s.about, s.team, s.pricing], BUSINESS: [s.about, s.products, s.pricing], CUSTOMER: [s.products, s.pricing],
    INVESTOR: [s.about, s.traction, s.team], HACKATHON: [s.about, s.project, s.team], ALL: Object.values(s),
  } as any;
    for (const m of MODES) {
    await db.modeConfig.create({ data: { profileId: p.id, mode: m, sectionIds: JSON.stringify(sel[m].map((x: any) => x.id)), ctaLabel: MODE_INFO[m].cta } });
    await db.shareLink.create({ data: { profileId: p.id, mode: m, token: randomBytes(6).toString("hex") } });
  }
}
main().then(() => db.$disconnect());
