/**
 * Full demo data for the demo account (Alex Rao, demo@founder.example), so every screen has something in it:
 * profile, every mode, documents, team, career, contacts and follow-ups, inbox requests, hiring, events,
 * analytics, NFC tags, wallet, a team, integrations and the link page.
 *
 * Safe to run again: each part checks what is already there and only adds what is missing.
 * Run `npm run demo` (it runs demo-extras first for photos and people, then this).
 */
import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import { MODES, MODE_INFO } from "../lib/modes";
import { putUpload } from "../lib/storage";

const db = new PrismaClient();
const tok = (n = 8) => randomBytes(n).toString("hex");
const days = (n: number) => new Date(Date.now() + n * 86400_000);
const at = (n: number, h = 10) => { const d = days(n); d.setHours(h, 0, 0, 0); return d; };

/** A small, valid one-page PDF, so document viewers have something real to show. */
function pdf(title: string, lines: string[]) {
  const esc = (t: string) => t.replace(/[\\()]/g, (c) => "\\" + c);
  const text = [`BT /F1 22 Tf 60 760 Td (${esc(title)}) Tj ET`, ...lines.map((l, i) => `BT /F1 12 Tf 60 ${720 - i * 20} Td (${esc(l)}) Tj ET`)].join("\n");
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(text)} >>\nstream\n${text}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offs: number[] = [];
  objs.forEach((o, i) => { offs.push(Buffer.byteLength(out)); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map((o) => String(o).padStart(10, "0") + " 00000 n \n").join("");
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out);
}

async function main() {
  const demo = await db.profile.findUnique({ where: { handle: "demo" }, include: { user: true } });
  if (!demo?.user) { console.log("demo data: no demo account, skipped"); return; }
  const pid = demo.id;
  const others = Object.fromEntries((await db.profile.findMany({ where: { handle: { in: ["maya", "arjun", "kavya", "leah", "ishaan", "anita", "rahul"] } }, include: { user: true } })).map((p) => [p.handle, p]));

  // ---------- Job seekers, so Find talent has people ----------
  const talent: Record<string, { openTo: string; skills: string; bio: string }> = {
    leah: { openTo: "Open to work", skills: "Product design, Figma, Design systems, User research, Prototyping", bio: "Product designer, 6 years across fintech and health. Looking for a founding design role." },
    ishaan: { openTo: "Open to work", skills: "TypeScript, React, Node.js, Python, PyTorch, Edge ML, Postgres", bio: "Full-stack engineer who ships ML to factory floors. Open to senior roles in Bengaluru." },
    maya: { openTo: "", skills: "Healthcare ops, Fundraising, Go-to-market", bio: "" },
    arjun: { openTo: "", skills: "Venture capital, FinTech, SaaS metrics", bio: "" },
  };
  for (const [h, t] of Object.entries(talent)) {
    const p = others[h];
    if (p && !p.skills) await db.profile.update({ where: { id: p.id }, data: { openTo: t.openTo, skills: t.skills, ...(p.bio ? {} : t.bio ? { bio: t.bio } : {}) } });
  }

  // ---------- Other demo people's mode pages, so tapping them shows a real page ----------
  const pages: Record<string, { mode: string; fields: Record<string, string>; kit: string; website?: string; bio?: string }> = {
    maya: { mode: "FOUNDER", website: "northwindhealth.example", bio: "Founder of Northwind Health. Clinic software that cuts patient wait times in half.", fields: { stage: "Seed", raising: "$1.5M", round: "Seed", users: "1,200", revenue: "$18k MRR", milestones: "Pilot with 3 clinics\nHIPAA audit passed\nHired first sales lead" }, kit: "Northwind Health schedules clinic visits around real doctor availability, so patients wait less and clinics see more people.\n\nWe are live in 3 clinics in Bengaluru and raising a seed round to expand to 40." },
    arjun: { mode: "INVESTOR", website: "orbitventures.example", bio: "Partner at Orbit Ventures. Backing technical founders at seed and Series A.", fields: { type: "VC", focus: "FinTech\nSaaS\nAI / ML", stages: "Seed\nSeries A", ticket: "$250k to $2M", portfolio: "Ledgerly\nCampus Loop\nNorthwind Health" }, kit: "I back technical founders building software for underserved industries. Send a short deck and one number that shows you are winning." },
    kavya: { mode: "SERVICES", website: "kilnandco.example", bio: "Handmade ceramics from our studio in Jayanagar.", fields: { industry: "Handmade ceramics", services: "Tableware\nCustom gifting\nPottery workshops", delivery: "Pan-India, 5 to 7 days", pricing: "Tableware from Rs 650. Corporate gifting from 50 pieces." }, kit: "Every piece is thrown and glazed by hand. We take custom orders for restaurants, weddings and corporate gifts." },
    rahul: { mode: "INVESTOR", website: "peakventures.example", bio: "Managing partner, Peak Ventures.", fields: { type: "VC", focus: "HealthTech\nClimate", stages: "Seed", ticket: "$500k+", portfolio: "GreenGrid\nCareLoop" }, kit: "We lead seed rounds in health and climate companies with real customers." },
    anita: { mode: "RECRUITER", website: "buildlab.example", bio: "Talent lead at BuildLab. We are hiring across product and engineering.", fields: { workType: "Hybrid", locations: "Bengaluru", perks: "Health cover\nESOPs\nLearning budget", process: "Intro call, take-home, team chat, offer in 2 weeks" }, kit: "BuildLab makes tools for construction teams. 60 people, Series B, growing fast." },
  };
  for (const [h, x] of Object.entries(pages)) {
    const p = others[h];
    if (!p) continue;
    const cfg = await db.modeConfig.findFirst({ where: { profileId: p.id, mode: x.mode } });
    if (cfg && !cfg.kitText) await db.modeConfig.update({ where: { id: cfg.id }, data: { isEnabled: true, kitText: x.kit, fields: JSON.stringify({ ...x.fields, ...JSON.parse(cfg.fields || "{}") }) } });
    if (!p.website || !p.bio) await db.profile.update({ where: { id: p.id }, data: { website: p.website || x.website || "", bio: p.bio || x.bio || "" } });
  }
  if (others.anita && !(await db.job.findFirst({ where: { profileId: others.anita.id } })))
    await db.job.create({ data: { profileId: others.anita.id, title: "Head of Product", location: "Bengaluru", workType: "Hybrid", employment: "Full-time", salary: "Rs 60 to 80 LPA", description: "Own the product roadmap for our field app used by 4,000 site managers.", open: true } as never }).catch(() => {});

  // ---------- Profile ----------
  await db.profile.update({ where: { id: pid }, data: {
    firstName: demo.firstName || "Alex", lastName: demo.lastName || "Rao",
    email: demo.email || "alex@lumenlabs.example", phone: demo.phone || "+91 98450 12345", website: demo.website || "https://lumenlabs.example",
    company: demo.company || "Lumen Labs", headline: demo.headline || "Founder & CEO",
    bio: demo.bio || "Building AI tools for small manufacturers. Second-time founder, previously ops at a Tier-1 auto supplier.",
    product: demo.product || "Lumen Vision: defect detection that runs on a $200 camera.",
    skills: demo.skills || "Computer vision, Manufacturing ops, Fundraising, Hiring",
    openTo: demo.openTo || "Advisory roles",
    socials: demo.socials && demo.socials !== "{}" ? demo.socials : JSON.stringify({ linkedin: "https://linkedin.com/in/alexrao-demo", x: "https://x.com/alexrao_demo", github: "https://github.com/alexrao-demo", whatsapp: "https://wa.me/919845012345" }),
  } });

  // ---------- Modes: on, with their own text ----------
  const kit: Record<string, { on: boolean; kitText?: string; intro?: string; bookingUrl?: string; approval?: boolean }> = {
    FOUNDER: { on: true, kitText: "What we do\nLumen Vision spots defects on production lines with a $200 camera and no data science team.\n\nWho it is for\nSmall and mid-size manufacturers in auto parts and electronics.", bookingUrl: "https://cal.com/alexrao-demo/30min" },
    INVESTOR: { on: true, kitText: "I back technical founders building for industry: manufacturing, logistics and climate. I write first cheques and help with first ten customers." },
    SERVICES: { on: true, kitText: "Starter kits, on-site line audits and custom inspection models for manufacturers." },
    RECRUITER: { on: true, kitText: "Small team, real factories, real impact. You will ship to plants within your first month.", intro: "We are hiring engineers and a product designer in Bengaluru." },
    NORMAL: { on: true, approval: false, kitText: "Hi, I am Alex. I build software for factories, drink too much filter coffee and play cricket most weekends. Say hello if you are in Bengaluru." },
    OTHER: { on: false },
    ALL: { on: true },
  };
  for (const m of MODES) {
    const k = kit[m]; if (!k) continue;
    const cfg = await db.modeConfig.findFirst({ where: { profileId: pid, mode: m } });
    if (!cfg) await db.modeConfig.create({ data: { profileId: pid, mode: m, ctaLabel: MODE_INFO[m].cta, isEnabled: k.on } });
    await db.modeConfig.updateMany({ where: { profileId: pid, mode: m }, data: {
      isEnabled: k.on,
      ...(k.kitText && !cfg?.kitText ? { kitText: k.kitText } : {}),
      ...(k.intro && !cfg?.intro ? { intro: k.intro } : {}),
      ...(k.bookingUrl && !cfg?.bookingUrl ? { bookingUrl: k.bookingUrl } : {}),
      ...(k.approval !== undefined ? { requireApproval: k.approval } : {}),
    } });
    if (!(await db.shareLink.findFirst({ where: { profileId: pid, mode: m } }))) await db.shareLink.create({ data: { profileId: pid, mode: m, token: tok(6) } });
  }
  const recruiterFields = { workType: "Hybrid", locations: "Bengaluru", perks: "Health cover\nESOPs\nLearning budget\nHardware of your choice", process: "Intro call (20 min)\nTake-home (2 hours)\nTeam chat and offer", applyUrl: "https://lumenlabs.example/careers" };
  await db.modeConfig.updateMany({ where: { profileId: pid, mode: "RECRUITER", fields: "{}" }, data: { fields: JSON.stringify(recruiterFields) } });

  // ---------- Team ----------
  if ((await db.teamMember.count({ where: { profileId: pid } })) === 0) {
    await db.teamMember.createMany({ data: [
      { profileId: pid, name: "Maya Iyer", role: "Advisor, product", memberHandle: others.maya ? "maya" : "", link: others.maya ? "/maya" : "", order: 1 },
      { profileId: pid, name: "Priya Nair", role: "CTO", order: 2 },
      { profileId: pid, name: "Dev Raman", role: "Head of sales", order: 3 },
    ] });
  }

  // ---------- Documents (real PDFs) ----------
  const doc = async (title: string, kind: string, modes: string, lines: string[], gated = false) => {
    if (await db.resource.findFirst({ where: { profileId: pid, title } })) return;
    const file = `doc-demo-${tok(5)}.pdf`;
    await putUpload(file, pdf(title, lines), "application/pdf");
    await db.resource.create({ data: { profileId: pid, kind, title, filePath: file, mime: "application/pdf", gated, modes } });
  };
  await doc("Lumen Labs seed deck", "DECK", "FOUNDER,ALL", ["Problem: 3% of parts ship with defects", "Product: inspection on a $200 camera", "Traction: 14 paying plants, $38k MRR", "Ask: $1.2M seed"]);
  await doc("Data room", "DOC", "FOUNDER", ["Cap table, financials and customer contracts", "Shared after a first call"], true);
  await doc("Investment thesis", "DOC", "INVESTOR", ["Industry software for the next billion factory workers", "Cheque size: $25k to $100k", "Stage: pre-seed and seed"]);
  await doc("Catalog and rate card", "DOC", "SERVICES", ["Starter kit: Rs 16,500", "Line audit: Rs 45,000", "Custom model: from Rs 1,50,000"]);
  await doc("Senior ML engineer: job description", "DOC", "RECRUITER", ["Train and ship vision models to plants", "4+ years, PyTorch, edge deployment"]);
  await doc("Alex Rao resume", "RESUME", "ALL", ["Founder, Lumen Labs (2022 to now)", "Operations lead, Apex Auto Parts (2016 to 2022)", "B.Tech, NIT Trichy"]);
  if (!(await db.resource.findFirst({ where: { profileId: pid, kind: "DEMO" } })))
    await db.resource.create({ data: { profileId: pid, kind: "DEMO", title: "Two-minute product demo", url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ", modes: "FOUNDER,SERVICES,ALL" } });

  // ---------- Career, for Hire me ----------
  if ((await db.careerItem.count({ where: { profileId: pid } })) === 0) {
    await db.careerItem.createMany({ data: [
      { profileId: pid, type: "EXPERIENCE", title: "Founder & CEO", org: "Lumen Labs", location: "Bengaluru", start: "2022-03", end: "", description: "Raised a pre-seed, grew to 14 paying plants." },
      { profileId: pid, type: "EXPERIENCE", title: "Operations lead", org: "Apex Auto Parts", location: "Pune", start: "2016-07", end: "2022-02", description: "Ran quality for 3 lines and 120 people." },
      { profileId: pid, type: "EXPERIENCE", title: "Graduate engineer", org: "Tata Motors", location: "Pune", start: "2014-07", end: "2016-06" },
      { profileId: pid, type: "EDUCATION", title: "B.Tech, Mechanical Engineering", org: "NIT Trichy", start: "2010", end: "2014" },
    ] });
  }

  // ---------- Projects ----------
  if ((await db.project.count({ where: { profileId: pid, eventId: null } })) === 0) {
    await db.project.createMany({ data: [
      { profileId: pid, name: "Line-stop alerts", tagline: "Realtime alerts when a line drifts out of spec", demoUrl: "https://lumenlabs.example/demo", repoUrl: "https://github.com/alexrao-demo/linestop", team: "Alex, Priya", modes: "FOUNDER" },
      { profileId: pid, name: "Shift report bot", tagline: "WhatsApp summaries for plant managers", demoUrl: "https://lumenlabs.example/bot", modes: "FOUNDER" },
    ] });
  }

  // ---------- Contacts: every state the Connections screen handles ----------
  type C = { name: string; email: string; company: string; mode: string; status?: string; source?: string; tags?: string; follow?: number; starred?: boolean; met?: string; job?: string; message?: string; notes?: string; ago: number };
  const contacts: C[] = [
    { name: "Tom Becker", email: "tom@fieldwork.example", company: "Fieldwork", mode: "FOUNDER", source: "qr", tags: "customer,pilot", follow: -2, starred: true, met: "Build Night Bengaluru", job: "COO", notes: "Wants a 2-line pilot in January.", ago: 9 },
    { name: "Priya Nair", email: "priya@stackline.example", company: "Stackline", mode: "ALL", source: "nfc", tags: "partner", follow: 0, met: "Coffee at Third Wave", job: "Head of partnerships", ago: 6 },
    { name: "Arjun Mehta", email: "arjun@demo.tapnodd.example", company: "Orbit Ventures", mode: "FOUNDER", source: "link", tags: "investor", follow: 3, starred: true, met: "Intro from Maya", job: "Partner", ago: 5 },
    { name: "Rahul Mehta", email: "rahul@demo.tapnodd.example", company: "Peak Ventures", mode: "FOUNDER", source: "qr", tags: "investor", follow: 7, met: "Founder Summit 2025", job: "Managing partner", ago: 12 },
    { name: "Sneha Patel", email: "sneha@brightgear.example", company: "BrightGear", mode: "SERVICES", source: "event", tags: "customer", met: "Auto Expo", job: "Plant head", ago: 15 },
    { name: "Karan Shah", email: "karan@voltmotors.example", company: "Volt Motors", mode: "SERVICES", source: "manual", tags: "customer,renewal", follow: 14, job: "Quality manager", ago: 21 },
    { name: "Leah Okafor", email: "leah@demo.tapnodd.example", company: "", mode: "RECRUITER", source: "qr", tags: "candidate,design", starred: true, met: "Design meetup", job: "Product designer", ago: 3 },
    { name: "Ishaan Verma", email: "ishaan@demo.tapnodd.example", company: "", mode: "RECRUITER", source: "event", tags: "candidate,engineering", job: "Full-stack engineer", ago: 4 },
    { name: "Meera Krishnan", email: "meera@pressworks.example", company: "PressWorks", mode: "FOUNDER", source: "link", tags: "", job: "CEO", ago: 30 },
    // Waiting for your yes
    { name: "Anita Desai", email: "anita@demo.tapnodd.example", company: "BuildLab", mode: "FOUNDER", status: "PENDING", source: "qr", message: "Loved your talk. Can we compare notes on hiring ML engineers?", ago: 1 },
    { name: "Vikram Joshi", email: "vikram@ironlink.example", company: "IronLink", mode: "ALL", status: "PENDING", source: "nfc", message: "We met at the Pune plant visit.", ago: 0 },
    // Buyer leads from the Seller page
    { name: "Nisha Rao", email: "nisha@flexparts.example", company: "FlexParts", mode: "SERVICES", status: "PENDING", source: "link", tags: "lead", message: "Asked about Lumen Vision starter kit: need 5 kits for two lines", ago: 2 },
    { name: "Omar Siddiqui", email: "omar@castwell.example", company: "Castwell Foundry", mode: "SERVICES", status: "PENDING", source: "link", tags: "lead", message: "Asked for a quote: line audit in Coimbatore next month", ago: 1 },
    { name: "Grace Thomas", email: "grace@moldtech.example", company: "MoldTech", mode: "SERVICES", source: "link", tags: "lead,customer", message: "Asked about Extra camera", ago: 8 },
  ];
  for (const c of contacts) {
    if (await db.contact.findUnique({ where: { profileId_email: { profileId: pid, email: c.email } } })) continue;
    const made = await db.contact.create({ data: {
      profileId: pid, name: c.name, email: c.email, company: c.company, mode: c.mode, status: c.status ?? "CONNECTED", source: c.source ?? "link",
      tags: c.tags ?? "", followUpAt: c.follow === undefined ? null : at(c.follow, 9), starred: !!c.starred, metAt: c.met ?? "", jobTitle: c.job ?? "",
      message: c.message ?? "", notes: c.notes ?? "", createdAt: days(-c.ago), lastInteractionAt: days(-Math.max(0, c.ago - 1)), interactions: 1 + (c.ago % 3),
    } });
    await db.contactActivity.createMany({ data: [
      { contactId: made.id, kind: "created", text: c.message || `Shared details from your ${MODE_INFO[c.mode as keyof typeof MODE_INFO]?.label ?? "main"} page`, createdAt: days(-c.ago) },
      ...(c.status ? [] : [{ contactId: made.id, kind: "accepted", text: "You accepted", createdAt: days(-c.ago + 0.2) }]),
      ...(c.notes ? [{ contactId: made.id, kind: "note", text: c.notes, createdAt: days(-c.ago + 1) }] : []),
      ...(c.follow !== undefined ? [{ contactId: made.id, kind: "followup", text: "Follow-up set", createdAt: days(-c.ago + 1) }] : []),
    ] });
  }

  // ---------- Inbox: page access and file requests ----------
  // Old demo requests were for the Hire me page; Normal is never gated, so they belong to Investor now.
  await db.modeRequest.updateMany({ where: { profileId: pid, mode: { in: ["HIRE", "NORMAL"] } }, data: { mode: "INVESTOR" } });
  if ((await db.modeRequest.count({ where: { profileId: pid } })) === 0) {
    await db.modeRequest.createMany({ data: [
      { profileId: pid, mode: "INVESTOR", name: "Sara Kim", email: "sara@talentco.example", note: "Angel in robotics, keen to see your portfolio and co-invest.", token: tok(), createdAt: days(-1) },
      { profileId: pid, mode: "INVESTOR", name: "Daniel Cho", email: "daniel@hirewell.example", note: "Founder of a climate startup, would love to pitch you.", token: tok(), createdAt: days(-2) },
      { profileId: pid, mode: "INVESTOR", name: "Ritu Sen", email: "ritu@scalehr.example", note: "Advisory board search.", status: "APPROVED", token: tok(), createdAt: days(-6), decidedAt: days(-5) },
    ] });
  }
  const room = await db.resource.findFirst({ where: { profileId: pid, title: "Data room" } });
  if (room && (await db.deckRequest.count({ where: { resourceId: room.id } })) === 0) {
    await db.deckRequest.createMany({ data: [
      { resourceId: room.id, profileId: pid, name: "Arjun Mehta", email: "arjun@demo.tapnodd.example", token: tok(), createdAt: days(-1) },
      { resourceId: room.id, profileId: pid, name: "Lina Park", email: "lina@northstar.example", token: tok(), createdAt: days(-3) },
      { resourceId: room.id, profileId: pid, name: "Rahul Mehta", email: "rahul@demo.tapnodd.example", status: "APPROVED", token: tok(), createdAt: days(-7), decidedAt: days(-6) },
    ] });
  }

  // ---------- Events ----------
  const ensureEvent = async (slug: string, data: Record<string, unknown>) => (await db.event.findUnique({ where: { slug } })) ?? db.event.create({ data: { profileId: pid, slug, ...data } as never });
  const summit = await ensureEvent("founder-summit-demo", { name: "Founder Summit 2026", location: "Bengaluru", startsAt: at(9, 18), endsAt: at(9, 21) });
  await db.event.update({ where: { id: summit.id }, data: {
    summary: summit.summary || "Pitches, investor office hours and hiring tables.",
    description: summit.description || "An evening for founders, investors and builders. Five startups pitch, then open office hours with investors and a hiring floor.",
    agenda: summit.agenda || "18:00 Doors and coffee\n18:30 Five startup pitches\n19:30 Investor office hours\n20:15 Hiring floor and dinner",
    capacity: summit.capacity || 150, color1: "#5a3fd1", color2: "#22175a", modules: '["vouchers","recruiting","agenda"]',
    contactEmail: "events@lumenlabs.example", requireApproval: false, waitlist: true, plusOnes: 1,
    questions: JSON.stringify(["What are you building?", "Dietary needs"]),
  } as never });
  if ((await db.ticketClass.count({ where: { eventId: summit.id } })) === 0)
    await db.ticketClass.createMany({ data: [{ eventId: summit.id, name: "General", quota: 120 }, { eventId: summit.id, name: "Founder pass", quota: 30 }] });
  if ((await db.eventLink.count({ where: { eventId: summit.id } })) === 0)
    await db.eventLink.createMany({ data: [
      { eventId: summit.id, label: "Pitch submissions", url: "https://forms.example/pitch", purpose: "submission", order: 1 },
      { eventId: summit.id, label: "Community chat", url: "https://chat.example/summit", purpose: "community", order: 2 },
    ] });
  if ((await db.eventStaff.count({ where: { eventId: summit.id } })) === 0) {
    await db.eventStaff.create({ data: { eventId: summit.id, userId: demo.user.id, role: "ORGANIZER" } });
    if (others.maya?.user) await db.eventStaff.create({ data: { eventId: summit.id, userId: others.maya.user.id, role: "CHECKIN" } });
    if (others.kavya?.user) await db.eventStaff.create({ data: { eventId: summit.id, userId: others.kavya.user.id, role: "VENDOR" } });
  }
  const general = await db.ticketClass.findFirst({ where: { eventId: summit.id, name: "General" } });
  const guests = [
    ["Tom Becker", "tom@fieldwork.example", "Fieldwork", "CONFIRMED", true], ["Priya Nair", "priya@stackline.example", "Stackline", "CONFIRMED", false],
    ["Arjun Mehta", "arjun@demo.tapnodd.example", "Orbit Ventures", "CONFIRMED", true], ["Leah Okafor", "leah@demo.tapnodd.example", "", "CONFIRMED", false],
    ["Ishaan Verma", "ishaan@demo.tapnodd.example", "", "CONFIRMED", false], ["Sneha Patel", "sneha@brightgear.example", "BrightGear", "CONFIRMED", true],
    ["Karan Shah", "karan@voltmotors.example", "Volt Motors", "CONFIRMED", false], ["Meera Krishnan", "meera@pressworks.example", "PressWorks", "CONFIRMED", false],
    ["Zara Ali", "zara@quantfab.example", "QuantFab", "PENDING", false], ["Neil Dsouza", "neil@cobalt.example", "Cobalt", "WAITLIST", false],
    ["Asha Menon", "asha@ferrous.example", "Ferrous", "WAITLIST", false], ["Ben Lee", "ben@weldright.example", "WeldRight", "CANCELLED", false],
  ] as const;
  for (const [name, email, company, status, inNow] of guests) {
    if (await db.attendee.findFirst({ where: { eventId: summit.id, email } })) continue;
    await db.attendee.create({ data: { eventId: summit.id, name, email, company, status, token: tok(10), ticketClassId: general?.id, checkedInAt: inNow ? at(9, 18) : null, consentCard: true, answers: JSON.stringify({ "What are you building?": company ? `${company} tools` : "" }) } as never });
  }
  if ((await db.voucherPlan.count({ where: { eventId: summit.id } })) === 0) {
    const lunch = await db.voucherPlan.create({ data: { eventId: summit.id, name: "Dinner", perPerson: 1 } as never });
    const confirmed = await db.attendee.findMany({ where: { eventId: summit.id, status: "CONFIRMED" } });
    let seq = 0;
    for (const a of confirmed) await db.voucher.create({ data: { planId: lunch.id, attendeeId: a.id, token: tok(8), seq: ++seq, ...(a.checkedInAt ? { state: "REDEEMED", redeemedAt: at(9, 20) } : {}) } as never });
  }
  if ((await db.eventAnnouncement.count({ where: { eventId: summit.id } })) === 0)
    await db.eventAnnouncement.create({ data: { eventId: summit.id, subject: "Doors open at 6 PM", body: "Bring your ticket QR. Dinner is on us.", sent: 8 } });

  // ---------- Hiring: roles, applicants at every stage, invites ----------
  const ensureJob = async (title: string, data: Record<string, unknown>) => (await db.job.findFirst({ where: { profileId: pid, title } })) ?? db.job.create({ data: { profileId: pid, title, ...data } as never });
  const ml = await ensureJob("Senior ML engineer", { location: "Bengaluru", workType: "Hybrid", employment: "Full-time", salary: "Rs 35 to 50 LPA", description: "Train and ship vision models to plants. You own models from data to deployment on edge devices.", skills: "PyTorch, Computer vision, Edge deployment", eventId: summit.id });
  const pd = await ensureJob("Product designer", { location: "Bengaluru", workType: "Hybrid", employment: "Full-time", salary: "Rs 22 to 30 LPA", description: "Design tools that plant managers love. Field research included.", skills: "Figma, Prototyping, Research", eventId: summit.id });
  const fs = await ensureJob("Full-stack engineer", { location: "Remote (India)", workType: "Remote", employment: "Full-time", salary: "Rs 20 to 32 LPA", description: "Next.js dashboards and the APIs behind them.", skills: "TypeScript, React, Postgres" });
  await ensureJob("Sales intern", { location: "Pune", workType: "On-site", employment: "Internship", salary: "Rs 30k a month", description: "Help us reach 50 plants.", skills: "Communication", open: false });
  const apps: [string, string, string, string, string, number, string?][] = [
    [ml.id, "Rohan Gupta", "rohan@mlmail.example", "NEW", "", 0], [ml.id, "Fatima Khan", "fatima@mlmail.example", "SHORTLISTED", "", 4], [ml.id, "Ishaan Verma", "ishaan@demo.tapnodd.example", "INTERVIEW", "ishaan", 5, "Strong on edge deployment."],
    [ml.id, "Chen Wei", "chen@mlmail.example", "REJECTED", "", 2], [pd.id, "Leah Okafor", "leah@demo.tapnodd.example", "OFFER", "leah", 5, "Portfolio stood out."], [pd.id, "Tara Bose", "tara@design.example", "NEW", "", 0],
    [pd.id, "Kabir Malhotra", "kabir@design.example", "SHORTLISTED", "", 3], [fs.id, "Ana Souza", "ana@devmail.example", "NEW", "", 0], [fs.id, "Yusuf Ali", "yusuf@devmail.example", "HIRED", "", 5, "Joined in October."],
  ];
  for (const [jobId, name, email, status, handle, rating, notes] of apps) {
    if (await db.application.findFirst({ where: { jobId, email } })) continue;
    await db.application.create({ data: { jobId, profileId: pid, name, email, status, candidateHandle: handle, rating, notes: notes ?? "", note: "I would love to help ship to more plants.", linkedin: `https://linkedin.com/in/${name.toLowerCase().replace(/\s+/g, "-")}-demo`, resumeUrl: "https://example.com/resume.pdf", interviewAt: status === "INTERVIEW" ? at(2, 15) : null, eventId: jobId === ml.id ? summit.id : "" } as never });
  }
  if (others.leah && !(await db.invite.findFirst({ where: { jobId: pd.id, candidateProfileId: others.leah.id } })))
    await db.invite.create({ data: { jobId: pd.id, recruiterProfileId: pid, candidateProfileId: others.leah.id } });
  // A role someone else invited you to (shows under Opportunities).
  if (others.anita) {
    const theirs = (await db.job.findFirst({ where: { profileId: others.anita.id, title: "Head of Product" } })) ?? await db.job.create({ data: { profileId: others.anita.id, title: "Head of Product", location: "Bengaluru", workType: "Hybrid", employment: "Full-time", salary: "Rs 60 to 80 LPA", description: "Lead product at BuildLab.", skills: "Product strategy, B2B" } as never });
    if (!(await db.invite.findFirst({ where: { jobId: theirs.id, candidateProfileId: pid } }))) await db.invite.create({ data: { jobId: theirs.id, recruiterProfileId: others.anita.id, candidateProfileId: pid } });
  }

  // ---------- Analytics: 30 days of card views ----------
  const links = await db.shareLink.findMany({ where: { profileId: pid } });
  const recent = await db.scanEvent.count({ where: { shareLinkId: { in: links.map((l) => l.id) }, createdAt: { gte: days(-30) } } });
  if (recent < 120) {
    const weights: [string, number][] = [["FOUNDER", 5], ["ALL", 4], ["INVESTOR", 2], ["SERVICES", 3], ["RECRUITER", 2], ["NORMAL", 3]];
    const sources = ["qr", "qr", "qr", "nfc", "link", "link", "email"];
    const rows = [];
    let seed = 7;
    const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    for (let d = 29; d >= 0; d--) {
      const n = 3 + Math.round((29 - d) / 4 + rnd() * 4);
      for (let i = 0; i < n; i++) {
        let r = rnd() * 17, mode = "ALL";
        for (const [m, w] of weights) { if ((r -= w) <= 0) { mode = m; break; } }
        const link = links.find((l) => l.mode === mode) ?? links[0];
        const when = days(-d); when.setHours(9 + Math.floor(rnd() * 11), Math.floor(rnd() * 60));
        rows.push({ shareLinkId: link.id, mode, source: sources[Math.floor(rnd() * sources.length)], visitorId: `demo-v${Math.floor(rnd() * 400)}`, createdAt: when });
      }
    }
    await db.scanEvent.createMany({ data: rows });
  }

  // ---------- NFC tags ----------
  if ((await db.nfcTag.count({ where: { profileId: pid } })) === 0)
    await db.nfcTag.createMany({ data: [
      { profileId: pid, nickname: "Metal card", token: tok(8), mode: "FOUNDER", taps: 41, lastTapAt: days(-1) },
      { profileId: pid, nickname: "Booth sticker", token: tok(8), mode: "SERVICES", taps: 17, lastTapAt: days(-4) },
    ] });

  // ---------- Wallet: cards you saved ----------
  for (const [h, mode] of [["maya", "FOUNDER"], ["arjun", "INVESTOR"], ["kavya", "SERVICES"]] as const) {
    const p = others[h]; if (!p) continue;
    if (!(await db.savedCard.findFirst({ where: { userId: demo.user.id, profileId: p.id } }))) await db.savedCard.create({ data: { userId: demo.user.id, profileId: p.id, mode, note: h === "arjun" ? "Follow up after demo day" : "" } });
  }

  // ---------- Team: an organisation with members ----------
  if (!(await db.orgMember.findFirst({ where: { userId: demo.user.id } }))) {
    const org = await db.organization.create({ data: { name: "Lumen Labs", company: "Lumen Labs", color1: "#5a3fd1", color2: "#22175a", bannerText: "Meet us at Founder Summit 2026", bannerUrl: "/e/founder-summit-demo" } as never });
    await db.orgMember.create({ data: { orgId: org.id, userId: demo.user.id, role: "OWNER" } });
    for (const h of ["leah", "ishaan"]) if (others[h]?.user && !(await db.orgMember.findFirst({ where: { userId: others[h].user!.id } }))) await db.orgMember.create({ data: { orgId: org.id, userId: others[h].user!.id, role: "MEMBER" } });
    await db.orgInvite.create({ data: { orgId: org.id, email: "dev.raman@lumenlabs.example", role: "MEMBER", token: tok(12) } });
    await db.orgAudit.createMany({ data: [
      { orgId: org.id, actorId: demo.user.id, action: "org.created", detail: "Lumen Labs" },
      { orgId: org.id, actorId: demo.user.id, action: "member.invited", detail: "dev.raman@lumenlabs.example" },
      { orgId: org.id, actorId: demo.user.id, action: "brand.saved", detail: "Violet" },
    ] });
  }

  // ---------- Integrations and an API key ----------
  if ((await db.integration.count({ where: { profileId: pid } })) === 0) {
    const hook = await db.integration.create({ data: { profileId: pid, kind: "WEBHOOK", label: "CRM sync (Zapier)", url: "https://hooks.zapier.com/hooks/catch/000000/demo", secret: tok(12), enabled: true, lastStatus: "200", lastAt: days(-1) } as never });
    await db.integrationDelivery.createMany({ data: [
      { integrationId: hook.id, event: "contact.created", ok: true, detail: "200", createdAt: days(-1) },
      { integrationId: hook.id, event: "event.registered", ok: true, detail: "200", createdAt: days(-2) },
      { integrationId: hook.id, event: "contact.accepted", ok: false, detail: "Timed out after 5s", createdAt: days(-3) },
    ] });
  }
  if ((await db.apiToken.count({ where: { profileId: pid } })) === 0)
    await db.apiToken.create({ data: { profileId: pid, label: "Spreadsheet export", tokenHash: createHash("sha256").update("ft_" + tok(24)).digest("hex"), lastUsedAt: days(-2) } });

  // ---------- Link page ----------
  if ((await db.bioLink.count({ where: { profileId: pid } })) === 0)
    await db.bioLink.createMany({ data: [
      { profileId: pid, title: "Book a 30-minute call", url: "https://cal.com/alexrao-demo/30min", featured: true, order: 1, clicks: 48 },
      { profileId: pid, title: "Lumen Labs", url: "", kind: "HEADER", order: 2 },
      { profileId: pid, title: "Product demo", url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ", order: 3, clicks: 31 },
      { profileId: pid, title: "We are hiring", url: "/demo/recruiter", order: 4, clicks: 22 },
      { profileId: pid, title: "Newsletter: Factory notes", url: "https://lumenlabs.example/notes", order: 5, clicks: 9 },
    ] as never });

  console.log("demo data: ready");
}

main().catch((e) => { console.error("demo data skipped:", e?.message ?? e); }).finally(() => db.$disconnect());
