import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const PDF = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
const docs = [
  { kind: "DECK", title: "Lumen Vision pitch deck", url: PDF, gated: false, tags: "" },
  { kind: "DECK", title: "Financial model (investors only)", url: PDF, gated: true, tags: "financials" },
  { kind: "DEMO", title: "Product demo: defect detection in 90 seconds", url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ", gated: false, tags: "" },
  { kind: "DOC", title: "Company one-pager", url: PDF, gated: false, tags: "" },
  { kind: "SUPPORT", title: "Customer case study: Orion Plastics", url: PDF, gated: false, tags: "case study,customers" },
  { kind: "SUPPORT", title: "Security and data handling overview", url: PDF, gated: false, tags: "legal,security" },
  { kind: "SUPPORT", title: "Cap table summary", url: PDF, gated: true, tags: "financials,legal" },
];
(async () => {
  const p = await db.profile.findUnique({ where: { handle: "demo" } });
  if (!p) throw new Error("demo profile not found");
  for (const d of docs) {
    const have = await db.resource.findFirst({ where: { profileId: p.id, title: d.title } });
    if (!have) await db.resource.create({ data: { profileId: p.id, ...d, modes: "FOUNDER,ALL" } });
  }
  console.log("resources:", await db.resource.count({ where: { profileId: p.id } }));
})().finally(() => db.$disconnect());
