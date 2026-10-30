/* State, saving and the rules that decide what shows. */
"use strict";

var KEY = "foundertouch.app.v1";
var S = null;          // the whole app state
var DB = null;         // { db, id } once the artifact database answers
var saveTimer = null, dbBusy = false, dbDirty = false;

function blank() {
  return {
    setup: false,
    me: { first: "", last: "", handle: "", headline: "", company: "", bio: "", phone: "", email: "", website: "", theme: "sunset", socials: {}, avatar: Object.assign({}, AV_DEFAULT), openTo: "", skills: "", hireModes: ["FOUNDER", "SERVICES", "HACKATHON"] },
    modes: {}, resources: [], team: [], career: [], jobs: [], apps: [], events: [], attendees: [], projects: [], contacts: [], modeReqs: [], fileReqs: [], saved: [], scans: []
  };
}
function cfg(m) {
  if (!S.modes[m]) S.modes[m] = { kitText: "", fields: {}, intro: "", cta: MODE_INFO[m].cta, booking: "", approval: false, enabled: true };
  return S.modes[m];
}
function fullName() { return (S.me.first + " " + S.me.last).trim(); }

/* ---------- saving ---------- */
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage may be unavailable */ }
  dbDirty = true;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushDb, 700);
}
async function flushDb() {
  if (!DB || dbBusy || !dbDirty) return;
  dbBusy = true; dbDirty = false;
  try { await DB.db.doc("data/users/" + DB.id + "/app").set({ state: JSON.stringify(S), at: Date.now() }); } catch (e) { /* keep working locally */ }
  dbBusy = false;
  if (dbDirty) flushDb();
}
function loadLocal() {
  try { var t = localStorage.getItem(KEY); if (t) return Object.assign(blank(), JSON.parse(t)); } catch (e) { }
  return blank();
}
/* Connects to the artifact database when this view has one. Resolves true if it replaced the state. */
async function connectDb() {
  try {
    if (!window.claude || !claude.use) return false;
    var user = await claude.use("user"), db = await claude.use("db");
    if (!db || !user) return false;
    var id = await user.id(); if (!id) return false;
    DB = { db: db, id: id };
    var snap = await db.doc("data/users/" + id + "/app").get();
    if (snap.exists && snap.data() && snap.data().state) {
      var remote = JSON.parse(snap.data().state);
      S = Object.assign(blank(), remote);
      try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { }
      return true;
    }
    dbDirty = true; flushDb();
  } catch (e) { DB = null; }
  return false;
}

/* ---------- rules ---------- */
function resFor(mode, kind) {
  return S.resources.filter(function (r) { return (!kind || r.kind === kind) && (mode === "ALL" || r.modes.indexOf(mode) >= 0) && !!MODE_INFO[mode].kinds[r.kind]; });
}
function hasContent(mode) {
  if (mode === "ALL") return true;
  var c = S.modes[mode]; if (!c || c.enabled === false) return false;
  if ((c.kitText || "").trim() || (c.intro || "").trim()) return true;
  if (Object.keys(c.fields || {}).some(function (k) { return String(c.fields[k]).trim(); })) return true;
  if (S.resources.some(function (r) { return r.modes.indexOf(mode) >= 0; })) return true;
  if (mode === "HACKATHON" && (S.projects.some(function (p) { return !p.eventId; }) || S.events.length)) return true;
  if (mode === "RECRUITER" && S.jobs.some(function (j) { return j.open; })) return true;
  return false;
}
function visibleModes() { return MODES.filter(function (m) { return hasContent(m); }); }

function needs(mode) {
  var c = cfg(mode), f = c.fields || {}, has = function (k) { return !!String(f[k] || "").trim(); };
  var m = S.me, about = !!(c.kitText || (mode === "FOUNDER" && m.product) || "").trim();
  var contact = { ok: !!(m.phone || m.email), label: "Add a phone or email", go: "contact" };
  var book = { ok: !!c.booking, label: "Add a booking link", go: "share" };
  var team = { ok: S.team.length > 0, label: "Add your team", go: "company" };
  var kit = function (label, ok, kind) { return { ok: ok, label: label, go: "kit", mode: mode, kind: kind }; };
  var A = kit("Describe what you do", about);
  switch (mode) {
    case "FOUNDER": return [A, kit("Add a pitch deck", resFor(mode, "DECK").length > 0, "DECK"), kit("Add a product demo", resFor(mode, "DEMO").length > 0, "DEMO"), team];
    case "INVESTOR": return [kit("Write your investment thesis", about), kit("Add sectors and stages you invest in", has("focus") || has("stages")), kit("Add your portfolio or portfolio link", has("portfolio") || has("portfolioUrl")), book];
    case "SELLER": return [kit("List what you sell", about), kit("Add a catalog or store link", resFor(mode, "DOC").length > 0 || has("catalogUrl"), "DOC"), contact, book];
    case "SERVICES": return [kit("Describe your services", about), kit("List the services you offer", has("services")), kit("Add a portfolio link", has("portfolioUrl") || !!(S.me.socials.portfolio)), book];
    case "RECRUITER": return [kit("Say why people should join you", about), { ok: S.jobs.some(function (j) { return j.open; }), label: "Post an open role", go: "jobs" }, kit("Add perks or your hiring process", has("perks") || has("process")), { ok: !!m.company, label: "Add your company name", go: "company" }];
    case "HACKATHON": return [{ ok: S.projects.some(function (p) { return !p.eventId; }), label: "Add a project and demo", go: "projects" }, kit("Add your skills and stack", has("skills")), { ok: S.events.length > 0, label: "Create or add an event", go: "events" }];
    case "BUSINESS": return [kit("Describe what your company offers", about), { ok: !!m.company, label: "Add your company name", go: "company" }, { ok: !!m.website, label: "Add your website", go: "company" }, book];
    case "OTHER": return [kit("Give the page a title", has("title")), kit("Describe what this page is for", about), kit("Add a link", has("links") || has("url"))];
    default: return [{ ok: !!m.headline, label: "Write a headline", go: "details" }, { ok: !!m.bio, label: "Write a short bio", go: "details" }, contact, { ok: Object.keys(m.socials).length > 0, label: "Add a social link", go: "contact" }];
  }
}
function completeness() {
  var m = S.me, steps = [
    ["Add a headline", !!m.headline, "details"], ["Write a short bio", !!m.bio, "details"], ["Add a phone or email", !!(m.phone || m.email), "contact"],
    ["Add a social link", Object.keys(m.socials).length > 0, "contact"], ["Add your company name", !!m.company, "company"], ["Add a team member", S.team.length > 0, "company"],
    ["Fill in a mode", visibleModes().length > 1, "kit"], ["Add experience or education", S.career.length > 0, "hire"]];
  var done = steps.filter(function (s) { return s[1]; }).length;
  return { pct: Math.round(done / steps.length * 100), done: done, total: steps.length, next: steps.filter(function (s) { return !s[1]; })[0] };
}

/* ---------- small mutations ---------- */
function logScan(mode, src) { S.scans.push({ mode: mode, t: Date.now(), src: src || "qr" }); if (S.scans.length > 400) S.scans.shift(); }
function addContact(name, email, company, mode) {
  email = (email || "").toLowerCase();
  var c = S.contacts.filter(function (x) { return x.email === email; })[0];
  if (c) { c.name = name; c.mode = mode; return c; }
  c = { id: uid("c"), name: name, email: email, company: company || "", mode: mode, at: Date.now() }; S.contacts.unshift(c); return c;
}

/* ---------- sample data: a filled-in account so every screen has something to show ---------- */
function sampleState() {
  var s = blank(), d = 864e5, now = Date.now();
  s.setup = true;
  s.me = { first: "Alex", last: "Rao", handle: "alex-rao", headline: "Founder, Lumen Labs", company: "Lumen Labs", bio: "Building AI tools for small manufacturers. Second-time founder, previously ops at a Tier-1 auto supplier.", phone: "+91 98765 43210", email: "alex@lumenlabs.example", website: "https://lumenlabs.example", theme: "sunset",
    socials: { linkedin: "https://linkedin.com/in/alexrao", github: "https://github.com/alexrao", x: "https://x.com/alex", portfolio: "https://alexrao.dev", whatsapp: "https://wa.me/919876543210" },
    avatar: { bg: "#dbe4ff", skin: "#eab98a", face: 0, hair: "#2b1b12", style: 0, eyes: "#3b2a1d", brows: 0, mouth: 0, glasses: 1, beard: 0, accessory: 0, outfit: 0, shirt: "#3b5bdb" },
    openTo: "Open to consulting", skills: "Computer vision, Operations, Product strategy", hireModes: ["FOUNDER", "SERVICES", "HACKATHON"], product: "" };
  var M = function (m, o) { s.modes[m] = Object.assign({ kitText: "", fields: {}, intro: "", cta: MODE_INFO[m].cta, booking: "", approval: false, enabled: true }, o); };
  M("FOUNDER", { kitText: "Lumen Vision: defect detection that runs on a $200 camera.", fields: { stage: "Seed", traction: "14 paying plants, $38k MRR, 9% MoM growth.", lookingFor: "investors, plant partners" }, booking: "https://calendly.com/alexrao/30min" });
  M("INVESTOR", { kitText: "I back technical founders solving unglamorous problems in India.", fields: { type: "Angel", firm: "Orbit Ventures", focus: "fintech, climate, AI", stages: "pre-seed, seed", ticket: "$25k to $250k", geography: "India", portfolio: "Razorpay\nZepto\nPaperPilot", portfolioUrl: "https://angel.co/alex-portfolio", howToPitch: "Send a 5-line email with traction." }, booking: "https://calendly.com/alexrao/pitch" });
  M("SERVICES", { kitText: "Computer vision pilots for factories.", fields: { services: "Defect-detection pilots\nLine audits\nModel training", rate: "From ₹2,00,000 per pilot", availability: "Taking clients from December", portfolioUrl: "https://alexrao.dev" } });
  M("RECRUITER", { kitText: "Small team, big problems. We ship every week and own what we build.", fields: { workType: "Hybrid", locations: "Bengaluru, Remote (India)", perks: "Health cover\nLearning budget\nESOPs", process: "Intro call (20 min)\nTask (2 hours)\nTeam interview\nOffer in 3 days" } });
  M("HACKATHON", { kitText: "I build quick demos with ML.", fields: { role: "Organizer", skills: "React, Python, ML", team: "Yes" } });
  s.resources = [
    { id: uid("r"), kind: "DECK", title: "Pitch deck", url: "https://drive.google.com/file/d/abc/view", modes: ["FOUNDER"], gated: true, tags: "" },
    { id: uid("r"), kind: "DEMO", title: "Product demo", url: "https://youtu.be/dQw4w9WgXcQ", modes: ["FOUNDER", "SERVICES"], gated: false, tags: "" },
    { id: uid("r"), kind: "SUPPORT", title: "Cap table", url: "https://drive.google.com/file/d/xyz/view", modes: ["FOUNDER", "INVESTOR"], gated: true, tags: "financials, investors" },
    { id: uid("r"), kind: "DOC", title: "Thesis one-pager", url: "https://example.com/thesis.pdf", modes: ["INVESTOR"], gated: false, tags: "" }];
  s.team = [{ id: uid("t"), name: "Priya Nair", role: "CTO", link: "https://linkedin.com/in/priya" }, { id: uid("t"), name: "Sam Lee", role: "Design", link: "https://samlee.design" }];
  s.career = [
    { id: uid("k"), type: "EXPERIENCE", title: "Founder & CEO", org: "Lumen Labs", location: "Bengaluru", start: "2023-04", end: "", description: "Building defect detection for small manufacturers.\n14 paying plants." },
    { id: uid("k"), type: "EXPERIENCE", title: "Operations Lead", org: "Tier-1 Auto Supplier", location: "", start: "2018-06", end: "2023-03", description: "Ran a 3-plant line." },
    { id: uid("k"), type: "EDUCATION", title: "B.Tech, Mechanical Engineering", org: "NIT Trichy", location: "", start: "2014", end: "2018", description: "First class with distinction." }];
  var ev = { id: uid("e"), name: "Bengaluru AI Hackathon", description: "24 hours. Build something useful with AI.\nPrizes for the top 3 teams.", agenda: "10:00  Doors open\n11:00  Kick-off\n17:00  Demos", location: "Koramangala, Bengaluru", startsAt: "", endsAt: "", capacity: 100, open: true, color1: "#0b7285", color2: "#1c7ed6" };
  s.events = [ev];
  var j1 = { id: uid("j"), title: "Senior Product Designer", location: "Bengaluru", workType: "Hybrid", employment: "Full-time", salary: "₹18–25 LPA", description: "Own the design of our factory dashboards.\nWork closely with engineers and plant managers.", skills: "Figma, Prototyping, Research", open: true, eventId: ev.id };
  var j2 = { id: uid("j"), title: "Computer Vision Engineer", location: "Remote", workType: "Remote", employment: "Full-time", salary: "₹25–40 LPA", description: "Build defect-detection models that run on cheap cameras.", skills: "Python, PyTorch", open: true, eventId: "" };
  s.jobs = [j1, j2];
  s.apps = [
    { id: uid("a"), jobId: j1.id, name: "Priya Shah", email: "priya@x.example", phone: "", note: "Built dashboards at two startups.", resume: "https://example.com/priya", status: "NEW", eventId: ev.id, via: true, at: now - 1 * d },
    { id: uid("a"), jobId: j1.id, name: "Sam Joshi", email: "sam@x.example", phone: "+91 90000 11111", note: "", resume: "", status: "SHORTLISTED", eventId: "", via: false, at: now - 3 * d }];
  s.attendees = [
    { id: uid("t"), eventId: ev.id, name: "Asha Rao", email: "asha@x.example", company: "Acme", code: "FT-" + uid("").slice(0, 6).toUpperCase(), interested: [j1.id], checkedInAt: 0 },
    { id: uid("t"), eventId: ev.id, name: "Dev Kumar", email: "dev@x.example", company: "", code: "FT-" + uid("").slice(0, 6).toUpperCase(), interested: [], checkedInAt: now - 3600e3 }];
  s.projects = [
    { id: uid("p"), eventId: ev.id, name: "LineStop Alerts", tagline: "Realtime defect alerts", description: "Camera feed → defect model → WhatsApp alert.", demo: "https://youtu.be/dQw4w9WgXcQ", repo: "https://github.com/x/linestop", team: "Asha, Dev", submitter: "Asha Rao" },
    { id: uid("p"), eventId: "", name: "Lumen Vision", tagline: "Defect detection on a $200 camera", description: "", demo: "https://www.loom.com/share/abc123def", repo: "", team: "Alex, Priya", submitter: "" }];
  s.contacts = [{ id: uid("c"), name: "Ravi Menon", email: "ravi@x.example", company: "Acme", mode: "INVESTOR", at: now - 2 * d }, { id: uid("c"), name: "Zoe Park", email: "zoe@x.example", company: "Orbit", mode: "FOUNDER", at: now - 4 * d }];
  s.modeReqs = [{ id: uid("q"), mode: "FOUNDER", name: "Meera Iyer", email: "meera@x.example", note: "Saw you at demo day", status: "PENDING", at: now - d / 2 }];
  s.fileReqs = [{ id: uid("f"), resourceId: s.resources[0].id, name: "Karan Mehta", email: "karan@x.example", status: "PENDING", at: now - d / 3 }];
  s.saved = [{ id: uid("s"), name: "Priya Nair", headline: "CTO, Lumen Labs", mode: "ALL" }];
  for (var i = 0; i < 26; i++) s.scans.push({ mode: ["FOUNDER", "FOUNDER", "INVESTOR", "SERVICES", "RECRUITER"][i % 5], t: now - Math.floor(Math.random() * 6.5 * d), src: i % 6 === 0 ? "nfc" : "qr" });
  return s;
}
