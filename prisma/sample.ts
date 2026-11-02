/**
 * Adds realistic sample activity so the app, mobile app and admin dashboard have something to show:
 * a few more people, contacts, access requests, an event with attendees, a job with applicants and saved cards.
 * Safe to run more than once. Everything here is fictional. Run with: npm run sample
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "crypto";
import { MODES, MODE_INFO } from "../lib/modes";
const db = new PrismaClient();
const tok = (n = 6) => randomBytes(n).toString("hex");
const hash = (pw: string) => { const s = randomBytes(16).toString("hex"); return s + ":" + scryptSync(pw, s, 32).toString("hex"); };
const daysAgo = (d: number, h = 10) => { const t = new Date(); t.setDate(t.getDate() - d); t.setHours(h, 0, 0, 0); return t; };

const PEOPLE = [
  { first: "Maya", last: "Iyer", email: "maya@northwind.example", handle: "maya", headline: "Founder", company: "Northwind Robotics", theme: "indigo", modes: ["FOUNDER", "HACKATHON"], days: 26 },
  { first: "Arjun", last: "Mehta", email: "arjun@orbit.example", handle: "arjun", headline: "Partner", company: "Orbit Ventures", theme: "midnight", modes: ["INVESTOR"], days: 19 },
  { first: "Leah", last: "Okafor", email: "leah@okafor.example", handle: "leah", headline: "Product designer", company: "", theme: "emerald", modes: ["HIRE"], days: 11 },
  { first: "Kavya", last: "Rao", email: "kavya@kiln.example", handle: "kavya", headline: "Owner", company: "Kiln & Co. Ceramics", theme: "sunset", modes: ["SERVICES"], days: 6 },
  { first: "Ishaan", last: "Verma", email: "ishaan@verma.example", handle: "ishaan", headline: "Engineer", company: "", theme: "rose", modes: ["HACKATHON", "HIRE"], days: 2 },
];

async function main() {
  const demo = await db.profile.findUnique({ where: { handle: "demo" }, include: { user: true } });
  if (!demo?.user) throw new Error("Run npm run db first so the demo account exists.");

  for (const p of PEOPLE) {
    if (await db.user.findUnique({ where: { email: p.email } })) continue;
    const u = await db.user.create({ data: { email: p.email, name: `${p.first} ${p.last}`, firstName: p.first, lastName: p.last, passwordHash: hash("sample1234"), createdAt: daysAgo(p.days), lastSeenAt: daysAgo(Math.max(0, p.days - 3)) } });
    const prof = await db.profile.create({ data: { userId: u.id, handle: p.handle, name: `${p.first} ${p.last}`, firstName: p.first, lastName: p.last, headline: p.headline, company: p.company, theme: p.theme, bio: `${p.headline}${p.company ? " at " + p.company : ""}.` } });
    for (const m of MODES) {
      await db.modeConfig.create({ data: { profileId: prof.id, mode: m, ctaLabel: MODE_INFO[m].cta, isEnabled: m === "ALL" || p.modes.includes(m) } });
      const link = await db.shareLink.create({ data: { profileId: prof.id, mode: m, token: tok() } });
      if (p.modes.includes(m)) for (let i = 0; i < 6 + p.days % 7; i++) await db.scanEvent.create({ data: { shareLinkId: link.id, mode: m, source: i % 4 ? "qr" : "link", visitorId: tok(4), createdAt: daysAgo(i % 9, 9 + i) } });
    }
  }

  // Activity on the demo account.
  const demoLinks = await db.shareLink.findMany({ where: { profileId: demo.id } });
  if (!(await db.scanEvent.count({ where: { shareLinkId: { in: demoLinks.map((l) => l.id) } } }))) {
    const founder = demoLinks.find((l) => l.mode === "FOUNDER")!, all = demoLinks.find((l) => l.mode === "ALL")!;
    for (let i = 0; i < 24; i++) await db.scanEvent.create({ data: { shareLinkId: (i % 3 ? founder : all).id, mode: i % 3 ? "FOUNDER" : "ALL", source: i % 5 ? "qr" : "nfc", visitorId: tok(4), createdAt: daysAgo(i % 7, 9 + (i % 9)) } });
  }
  const contacts = [["Arjun Mehta", "arjun@orbit.example", "Orbit Ventures", "FOUNDER"], ["Priya Nair", "priya@stackline.example", "Stackline", "ALL"], ["Tom Becker", "tom@fieldwork.example", "Fieldwork", "FOUNDER"]];
  for (const [name, email, company, mode] of contacts) await db.contact.upsert({ where: { profileId_email: { profileId: demo.id, email } }, update: {}, create: { profileId: demo.id, name, email, company, mode } });

  let deck = await db.resource.findFirst({ where: { profileId: demo.id, kind: "DECK" } });
  if (!deck) deck = await db.resource.create({ data: { profileId: demo.id, kind: "DECK", title: "Seed pitch deck", url: "https://example.com/deck.pdf", gated: true, modes: "FOUNDER" } });
  if (!(await db.deckRequest.count({ where: { profileId: demo.id } }))) {
    await db.deckRequest.create({ data: { resourceId: deck.id, profileId: demo.id, name: "Arjun Mehta", email: "arjun@orbit.example", token: tok(12) } });
    await db.modeRequest.create({ data: { profileId: demo.id, mode: "INVESTOR", name: "Sara Lim", email: "sara@lim.example", note: "Met you at Build Night", token: tok(12) } });
  }

  let ev = await db.event.findFirst({ where: { profileId: demo.id } });
  if (!ev) {
    const start = daysAgo(-5, 18);
    ev = await db.event.create({ data: { profileId: demo.id, slug: `build-night-${tok(2)}`, name: "Build Night Bengaluru", description: "An evening of demos and hiring for hardware and AI teams.", location: "Indiranagar, Bengaluru", startsAt: start, endsAt: new Date(start.getTime() + 3 * 3600e3), capacity: 120, color1: "#1f5f7a", color2: "#123f52" } });
    const names = [["Leah Okafor", "leah@okafor.example", ""], ["Ishaan Verma", "ishaan@verma.example", ""], ["Priya Nair", "priya@stackline.example", "Stackline"], ["Tom Becker", "tom@fieldwork.example", "Fieldwork"], ["Sara Lim", "sara@lim.example", "Lim Labs"], ["Dev Raman", "dev@lumen.example", "Lumen Labs"]];
    for (const [i, [name, email, company]] of names.entries()) await db.attendee.create({ data: { eventId: ev.id, name, email, company, token: tok(10), checkedInAt: i < 2 ? daysAgo(0, 18) : null } });
  }

  if (!(await db.job.count({ where: { profileId: demo.id } }))) {
    const job = await db.job.create({ data: { profileId: demo.id, title: "Product designer", location: "Bengaluru", workType: "Hybrid", salary: "₹28L to ₹36L", description: "Design the tools our plant teams use every day.", eventId: ev.id } });
    const apps = [["Leah Okafor", "leah@okafor.example", "SHORTLISTED", "leah"], ["Ishaan Verma", "ishaan@verma.example", "NEW", "ishaan"], ["Nora Silva", "nora@silva.example", "INTERVIEW", ""], ["Ken Ito", "ken@ito.example", "NEW", ""]];
    for (const [name, email, status, handle] of apps) await db.application.create({ data: { jobId: job.id, profileId: demo.id, name, email, status, candidateHandle: handle } });
  }

  for (const h of ["maya", "arjun"]) {
    const t = await db.profile.findUnique({ where: { handle: h } });
    if (t) await db.savedCard.upsert({ where: { userId_profileId: { userId: demo.user.id, profileId: t.id } }, update: {}, create: { userId: demo.user.id, profileId: t.id, mode: h === "maya" ? "FOUNDER" : "INVESTOR" } });
  }
  console.log("Sample data ready:", await db.user.count(), "users,", await db.scanEvent.count(), "scans");
}
main().finally(() => db.$disconnect());
