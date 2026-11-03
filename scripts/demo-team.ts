import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "crypto";
import { MODES, MODE_INFO } from "../lib/modes";
const db = new PrismaClient();
const people = [
  { handle: "priya", name: "Priya Nair", headline: "CTO, Lumen Labs", email: "priya@lumenlabs.example", phone: "+91 98765 43211", role: "CTO" },
  { handle: "sam", name: "Sam Lee", headline: "Head of Design, Lumen Labs", email: "sam@lumenlabs.example", phone: "+91 98765 43212", role: "Design" },
  { handle: "dev", name: "Dev Menon", headline: "Operations, Lumen Labs", email: "dev@lumenlabs.example", phone: "+91 98765 43213", role: "Operations" },
  { handle: "anika", name: "Anika Shah", headline: "Senior ML Engineer, Lumen Labs", email: "anika@lumenlabs.example", phone: "+91 98765 43214", role: "ML Engineer" },
];
(async () => {
  const alex = await db.profile.findUnique({ where: { handle: "demo" } });
  if (!alex || !alex.userId) throw new Error("demo profile missing");
  let org = (await db.orgMember.findUnique({ where: { userId: alex.userId }, include: { org: true } }))?.org;
  if (!org) {
    org = await db.organization.create({ data: { name: "Lumen Labs", company: "Lumen Labs" } });
    await db.orgMember.create({ data: { orgId: org.id, userId: alex.userId, role: "OWNER" } });
  }
  await db.teamMember.deleteMany({ where: { profileId: alex.id } });
  let order = 0;
  for (const x of people) {
    let prof = await db.profile.findUnique({ where: { handle: x.handle } });
    if (!prof) {
      const salt = randomBytes(16).toString("hex");
      const u = await db.user.create({ data: { email: x.email, name: x.name, passwordHash: salt + ":" + scryptSync("demo1234", salt, 32).toString("hex") } });
      prof = await db.profile.create({ data: { userId: u.id, handle: x.handle, name: x.name, headline: x.headline, company: "Lumen Labs", email: x.email, phone: x.phone, website: "https://lumenlabs.example", theme: alex.theme, logo: alex.logo } });
      for (const m of MODES) {
        await db.modeConfig.create({ data: { profileId: prof.id, mode: m, ctaLabel: MODE_INFO[m].cta, kitText: m === "FOUNDER" ? "Part of the Lumen Labs team: defect detection that runs on a $200 camera." : "" } });
        await db.shareLink.create({ data: { profileId: prof.id, mode: m, token: randomBytes(6).toString("hex") } });
      }
    }
    if (!(await db.orgMember.findUnique({ where: { userId: prof!.userId! } }))) await db.orgMember.create({ data: { orgId: org.id, userId: prof!.userId!, role: "MEMBER" } });
    await db.teamMember.create({ data: { profileId: alex.id, name: x.name, role: x.role, memberHandle: x.handle, order: order++ } });
  }
  console.log("members:", await db.orgMember.count({ where: { orgId: org.id } }));
})().finally(() => db.$disconnect());
