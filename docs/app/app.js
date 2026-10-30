/* Rendering, actions, forms and routing. */
"use strict";

ui.unlocked = {}; ui.avTab = "Looks";

function render() {
  var ph = $("#phone"), old = ph.querySelector(".screen"), top = old ? old.scrollTop : 0, key = ui.tab + (ui.page ? ui.page.name : "") + (ui.visitor ? "v" + ui.visitor.pane : "");
  var html;
  try {
    html = ui.visitor ? vVisitor() : !S.setup ? vOnboarding() : ({ share: vShare, events: vEvents, contacts: vContacts, profile: vProfile }[ui.tab])();
  } catch (e) { html = '<div class="screen"><div class="err">Something went wrong: ' + esc(e.message) + '</div><button data-act="tab" data-tab="share">Back</button></div>'; if (window.console) console.error(e); }
  ph.innerHTML = html;
  var sc = ph.querySelector(".screen"); if (sc && ui._key === key) sc.scrollTop = top; ui._key = key;
}
function go(tab, page) { ui.tab = tab; ui.page = page || null; ui.visitor = null; render(); }
function say(m) { ui.flash = m; }
function val(fd, k) { return String(fd.get(k) == null ? "" : fd.get(k)).trim(); }
function copyText(t) {
  var done = function () { ui.flash = "Copied ✓"; render(); setTimeout(function () { if (ui.flash === "") render(); }, 10); };
  try { navigator.clipboard.writeText(t).then(done, function () { ui.flash = "Copy this: " + t; render(); }); } catch (e) { ui.flash = "Copy this: " + t; render(); }
}

/* ---------- actions (clicks) ---------- */
var acts = {
  tab: function (d) { go(d.tab); },
  back: function (d) { var t = d.to; if (t === "events") ui.page = null; else if (t === "jobs") ui.page = { name: "jobs" }; else if (t === "kit") ui.page = { name: "kit" }; else ui.page = null; render(); },
  details: function () { go("profile", { name: "details" }); }, contact: function () { go("profile", { name: "contact" }); }, company: function () { go("profile", { name: "company" }); },
  hire: function () { go("profile", { name: "hire" }); }, jobs: function () { go("profile", { name: "jobs" }); }, projects: function () { go("profile", { name: "projects" }); }, avatar: function () { go("profile", { name: "avatar" }); },
  kit: function (d) { if (d.mode) ui.kitMode = d.mode; ui.kitKind = d.kind || ""; go("profile", { name: "kit" }); },
  share: function () { go("share"); }, events: function () { go("events"); },
  job: function (d) { go("profile", { name: "job", id: d.id }); },
  event: function (d) { go("events", { name: "event", id: d.id }); },
  flip: function (d, t) { var f = t.closest(".flip") || document.querySelector(".flip"); if (f) { f.classList.toggle("on"); ui.flipped = f.classList.contains("on"); } },
  copy: function (d) { copyText(d.text); },
  theme: function (d) { S.me.theme = d.k; save(); render(); },
  sample: function () { S = sampleState(); ui.shareSel = "FOUNDER"; ui.tab = "share"; ui.page = null; save(); render(); },
  reset: function (d, t) { if (!ui.confirmReset) { ui.confirmReset = true; t.textContent = "Tap again to erase everything"; return; } ui.confirmReset = false; S = blank(); ui.tab = "share"; ui.page = null; ui.wizard = 0; save(); render(); },
  wiz: function (d) { ui.wizard = Math.max(0, Math.min(2, ui.wizard + Number(d.d))); var f = $("form[data-form=wizard]"); if (f) { ["first", "last", "headline", "company", "phone", "handle", "bio"].forEach(function (k) { if (f.elements[k]) S.me[k] = f.elements[k].value; }); } render(); },
  unsave: function (d) { S.saved = S.saved.filter(function (c) { return c.id !== d.id; }); save(); render(); },
  publish: async function () {
    if (!DB) { ui.publishMsg = "Publishing needs the artifact database, which isn't available in this view."; render(); return; }
    var m = S.me; if (!m.handle) { ui.publishMsg = "Add a handle in Basic details first."; render(); return; }
    try {
      var pub = { handle: m.handle, me: m, modes: S.modes, resources: S.resources.filter(function (r) { return !r.gated; }), team: S.team, career: S.career, jobs: S.jobs.filter(function (j) { return j.open; }), events: S.events, projects: S.projects, at: Date.now() };
      await DB.db.doc("pages/" + DB.id).set({ handle: m.handle, data: JSON.stringify(pub) });
      ui.published = true; ui.publishMsg = "Published. Anyone who opens this artifact's link ending in #v-" + m.handle + " sees your page.";
    } catch (e) { ui.publishMsg = "Couldn't publish (" + (e && e.code || "error") + "). Your page still works here."; }
    render();
  },
  visit: function (d) { var m = d.mode || ui.shareSel; if (!MODE_INFO[m]) m = "ALL"; logScan(m, "qr"); save(); ui.vflash = ""; ui.visitor = { mode: m, pane: "me", src: ownSource() }; render(); },
  exitVisit: function () { ui.visitor = null; ui.vflash = ""; if (location.hash.indexOf("#v-") === 0) location.hash = ""; render(); },
  vpane: function (d) { ui.visitor.pane = d.p; ui.vflash = ""; render(); },
  vtag: function (d) { ui.vtag = d.t; render(); },
  unlock: function () { ui.unlocked[(ui.visitor.src.me.handle || "") + ui.visitor.mode] = true; render(); },
  applyTo: function (d) { ui.visitor.pane = "apply"; ui.visitor.jobId = d.id; ui.vflash = ""; render(); },
  visitEvent: function (d) { if (!ui.visitor) ui.visitor = { mode: "ALL", pane: "me", src: ownSource() }; ui.visitor.event = d.id; ui.vflash = ""; render(); },
  exitEvent: function () { if (ui.visitor) ui.visitor.event = ""; ui.vflash = ""; render(); },
  saveCard: function () {
    var me = ui.visitor.src.me, nm = (me.first + " " + me.last).trim();
    if (!S.saved.some(function (c) { return c.name === nm; })) S.saved.unshift({ id: uid("s"), name: nm, headline: byline(me.headline, me.company), mode: ui.visitor.mode });
    save(); ui.vflash = "Saved to your wallet ✓"; render();
  },
  ctab: function (d) { ui.ctab = d.id; render(); },
  decideMode: function (d) { S.modeReqs.forEach(function (r) { if (r.id === d.id) r.status = d.s; }); save(); render(); },
  decideFile: function (d) { S.fileReqs.forEach(function (r) { if (r.id === d.id) r.status = d.s; }); save(); render(); },
  appStatus: function (d) { S.apps.forEach(function (a) { if (a.id === d.id) a.status = d.s; }); save(); render(); },
  checkin: function (d) { S.attendees.forEach(function (a) { if (a.id === d.id) a.checkedInAt = a.checkedInAt ? 0 : Date.now(); }); save(); render(); },
  ticket: function (d) { ui.ticketId = ui.ticketId === d.id ? "" : d.id; render(); },
  delAtt: function (d) { S.attendees = S.attendees.filter(function (a) { return a.id !== d.id; }); save(); render(); },
  toggleEvent: function (d) { var e = evById(d.id); if (e) e.open = !e.open; save(); render(); },
  delEvent: function (d) { S.events = S.events.filter(function (e) { return e.id !== d.id; }); S.attendees = S.attendees.filter(function (a) { return a.eventId !== d.id; }); S.projects = S.projects.filter(function (p) { return p.eventId !== d.id; }); S.jobs.forEach(function (j) { if (j.eventId === d.id) j.eventId = ""; }); save(); ui.page = null; render(); },
  toggleJob: function (d) { S.jobs.forEach(function (j) { if (j.id === d.id) j.open = !j.open; }); save(); render(); },
  delJob: function (d) { S.jobs = S.jobs.filter(function (j) { return j.id !== d.id; }); S.apps = S.apps.filter(function (a) { return a.jobId !== d.id; }); save(); render(); },
  delRes: function (d) { S.resources = S.resources.filter(function (r) { return r.id !== d.id; }); save(); render(); },
  delTeam: function (d) { S.team = S.team.filter(function (t) { return t.id !== d.id; }); save(); render(); },
  delCareer: function (d) { S.career = S.career.filter(function (c) { return c.id !== d.id; }); save(); render(); },
  delProject: function (d) { S.projects = S.projects.filter(function (p) { return p.id !== d.id; }); save(); render(); },
  av: function (d) { var k = d.k, v = /^\d+$/.test(d.v) ? Number(d.v) : d.v; S.me.avatar[k] = v; save(); render(); },
  avPreset: function (d) { S.me.avatar = Object.assign({}, AV_DEFAULT, AV_PRESETS[Number(d.i)]); save(); render(); },
  avTab: function (d) { ui.avTab = d.t; render(); },
  avRandom: function () {
    var pick = function (a) { return a[Math.floor(Math.random() * a.length)]; }, n = function (l) { return Math.floor(Math.random() * l); };
    S.me.avatar = { bg: pick(AV_OPTS.bg), skin: pick(AV_OPTS.skin), face: n(3), hair: pick(AV_OPTS.hair), style: n(8), eyes: pick(AV_OPTS.eyes), brows: n(4), mouth: n(5), glasses: Math.random() < .35 ? 1 + n(3) : 0, beard: Math.random() < .3 ? 1 + n(3) : 0, accessory: Math.random() < .3 ? 1 + n(3) : 0, outfit: n(4), shirt: pick(AV_OPTS.shirt) };
    save(); render();
  }
};

/* ---------- selects ---------- */
var changes = {
  shareSel: function (v) { ui.shareSel = v; ui.flipped = false; render(); },
  kitMode: function (v) { ui.kitMode = v; ui.kitKind = ""; render(); },
  vmode: function (v) { if (!v) return; ui.visitor.mode = v; ui.visitor.pane = "me"; logScan(v, "qr"); render(); }
};

/* ---------- forms (submits) ---------- */
var forms = {
  wizard: function (fd) {
    ["first", "last", "headline", "company", "phone", "handle", "bio"].forEach(function (k) { S.me[k] = val(fd, k); });
    S.me.handle = slug(S.me.handle || S.me.first + "-" + S.me.last) || "me";
    var picked = MODES.filter(function (m) { return m !== "ALL" && fd.get("mode_" + m); }); picked.forEach(function (m) { cfg(m); });
    S.setup = true; ui.kitMode = picked[0] || "FOUNDER"; ui.kitKind = ""; ui.shareSel = "ALL";
    if (picked.length) { ui.tab = "profile"; ui.page = { name: "kit" }; say("Add something to a mode to make it appear for visitors."); } else { ui.tab = "share"; ui.page = null; }
    save(); render();
  },
  details: function (fd) { var m = S.me; m.first = val(fd, "first"); m.last = val(fd, "last"); m.headline = val(fd, "headline"); m.bio = val(fd, "bio"); m.handle = slug(val(fd, "handle")) || slug(m.first + "-" + m.last) || "me"; save(); say("Saved ✓"); render(); },
  contact: function (fd) { var m = S.me, w = val(fd, "website"); m.phone = val(fd, "phone"); m.email = val(fd, "email"); m.website = w && !/^https?:\/\//i.test(w) ? "https://" + w : w; m.socials = {}; SOCIALS.forEach(function (s) { var u = socialUrl(s.k, val(fd, "soc_" + s.k)); if (u) m.socials[s.k] = u; }); save(); say("Saved ✓"); render(); },
  company: function (fd) { S.me.company = val(fd, "company"); save(); say("Saved ✓"); render(); },
  addTeam: function (fd) { S.team.push({ id: uid("t"), name: val(fd, "name"), role: val(fd, "role"), link: val(fd, "link") }); save(); say("Added ✓"); render(); },
  hire: function (fd) { var m = S.me; m.openTo = val(fd, "openTo"); m.skills = val(fd, "skills"); m.resumeUrl = val(fd, "resumeUrl"); m.hireModes = MODES.filter(function (x) { return x !== "ALL" && fd.get("hm_" + x); }); save(); say("Saved ✓"); render(); },
  addCareer: function (fd, d) {
    var e = d.type === "EDUCATION", cur = !!fd.get("current");
    S.career.push({ id: uid("k"), type: d.type, title: val(fd, "title"), org: val(fd, "org"), location: val(fd, "location"), start: val(fd, "start"), end: cur ? "" : val(fd, "end"), description: val(fd, "description") });
    save(); say("Added ✓"); render();
  },
  kitText: function (fd, d) {
    var c = cfg(d.mode); c.kitText = val(fd, "kitText"); c.fields = {};
    MODE_INFO[d.mode].fields.forEach(function (x) { var v = val(fd, "f_" + x.k); if (x.t === "url" && v && !/^https?:\/\//i.test(v)) v = "https://" + v; if (x.t === "select" && x.o.indexOf(v) < 0) v = ""; if (v) c.fields[x.k] = v; });
    save(); say("Saved ✓"); render();
  },
  addRes: function (fd, d) {
    var info = MODE_INFO[d.mode], url = val(fd, "url"); if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    var on = MODES.filter(function (x) { return x !== "ALL" && fd.get("on_" + x); }); if (!on.length) on = [d.mode];
    var kind = val(fd, "kind"); S.resources.push({ id: uid("r"), kind: kind, title: val(fd, "title") || info.kinds[kind], url: url, modes: on, gated: !!fd.get("gated"), tags: val(fd, "tags") });
    on.forEach(function (x) { cfg(x); }); save(); say("Added ✓"); render();
  },
  addJob: function (fd) {
    S.jobs.unshift({ id: uid("j"), title: val(fd, "title"), location: val(fd, "location"), workType: val(fd, "workType"), employment: val(fd, "employment") || "Full-time", salary: val(fd, "salary"), description: val(fd, "description"), skills: val(fd, "skills"), open: true, eventId: val(fd, "eventId") });
    cfg("RECRUITER"); save(); say("Role posted ✓"); render();
  },
  addProject: function (fd) { S.projects.unshift({ id: uid("p"), eventId: "", name: val(fd, "name"), tagline: val(fd, "tagline"), description: val(fd, "description"), demo: val(fd, "demo"), repo: val(fd, "repo"), team: val(fd, "team"), submitter: "" }); cfg("HACKATHON"); save(); say("Added ✓"); render(); },
  createEvent: function (fd) { var e = { id: uid("e"), name: val(fd, "name"), description: val(fd, "description"), agenda: "", location: val(fd, "location"), startsAt: "", endsAt: "", capacity: 0, open: true, color1: "", color2: "" }; S.events.unshift(e); save(); say("Event created ✓"); go("events", { name: "event", id: e.id }); },
  saveEvent: function (fd, d) { var e = evById(d.id); e.name = val(fd, "name"); e.description = val(fd, "description"); e.agenda = val(fd, "agenda"); e.location = val(fd, "location"); e.capacity = Math.max(0, parseInt(val(fd, "capacity"), 10) || 0); save(); say("Saved ✓"); render(); },
  saveBrand: function (fd, d) { var e = evById(d.id); e.color1 = val(fd, "color1"); e.color2 = val(fd, "color2"); save(); say("Saved ✓"); render(); },
  scanCode: function (fd, d) {
    var code = val(fd, "code").toUpperCase(), a = S.attendees.filter(function (x) { return x.eventId === d.id && x.code.toUpperCase() === code; })[0];
    if (!a) { ui.scanOk = false; ui.scanMsg = "❌ Not a ticket for this event"; }
    else if (a.checkedInAt) { ui.scanOk = false; ui.scanMsg = "⚠️ " + a.name + " was already checked in"; }
    else { a.checkedInAt = Date.now(); ui.scanOk = true; ui.scanMsg = "✅ " + a.name + " checked in"; }
    save(); render();
  },
  modeSettings: function (fd, d) { var c = cfg(d.mode); c.approval = !!fd.get("approval"); c.intro = val(fd, "intro"); c.cta = val(fd, "cta") || MODE_INFO[d.mode].cta; c.booking = val(fd, "booking"); if (d.mode !== "ALL") c.enabled = !fd.get("hide"); save(); say("Settings saved ✓"); if (c.enabled === false) ui.shareSel = visibleModes()[0]; render(); },
  /* simulated visitor forms: they add to the owner's data */
  vConnect: function (fd) { addContact(val(fd, "first") + " " + val(fd, "last"), val(fd, "email"), val(fd, "company"), ui.visitor.mode); save(); ui.vflash = "Sent ✓ They now appear in your Contacts."; render(); },
  vRequest: function (fd) { var nm = val(fd, "first") + " " + val(fd, "last"); S.modeReqs.unshift({ id: uid("q"), mode: ui.visitor.mode, name: nm, email: val(fd, "email").toLowerCase(), note: val(fd, "note"), status: "PENDING", at: Date.now() }); addContact(nm, val(fd, "email"), "", ui.visitor.mode); save(); ui.vflash = "Request sent ✓ The owner sees it under Contacts → Page access."; render(); },
  vFileReq: function (fd, d) { var nm = val(fd, "first") + " " + val(fd, "last"); S.fileReqs.unshift({ id: uid("f"), resourceId: d.id, name: nm, email: val(fd, "email").toLowerCase(), status: "PENDING", at: Date.now() }); addContact(nm, val(fd, "email"), "", ui.visitor.mode); save(); ui.vflash = "Request sent ✓"; render(); },
  vApply: function (fd, d) {
    var nm = val(fd, "first") + " " + val(fd, "last"), email = val(fd, "email").toLowerCase();
    if (S.apps.some(function (a) { return a.jobId === d.id && a.email === email; })) { ui.vflash = "You have already applied for this role with that email."; render(); return; }
    S.apps.unshift({ id: uid("a"), jobId: d.id, name: nm, email: email, phone: val(fd, "phone"), note: val(fd, "note"), resume: val(fd, "resume"), status: "NEW", eventId: ui.visitor.event || "", via: false, at: Date.now() });
    addContact(nm, email, "", "RECRUITER"); save(); ui.vflash = "Application sent ✓ It now shows under Contacts → Applicants."; render();
  },
  vRegister: function (fd, d) {
    var nm = val(fd, "first") + " " + val(fd, "last"), email = val(fd, "email").toLowerCase(), e = evById(d.id), mine = S.attendees.filter(function (a) { return a.eventId === d.id && a.email === email; })[0];
    if (!mine) {
      var wanted = S.jobs.filter(function (j) { return j.eventId === d.id && j.open && fd.get("job_" + j.id); }).map(function (j) { return j.id; });
      mine = { id: uid("t"), eventId: d.id, name: nm, email: email, company: val(fd, "company"), code: "FT-" + uid("").slice(0, 6).toUpperCase(), interested: wanted, checkedInAt: 0 }; S.attendees.push(mine); addContact(nm, email, mine.company, "HACKATHON");
    }
    ui.myTicket = mine.id; save(); ui.vflash = "You're registered ✓"; render();
  },
  vProject: function (fd, d) { var nm = val(fd, "first") + " " + val(fd, "last"); S.projects.unshift({ id: uid("p"), eventId: d.id, name: val(fd, "name"), tagline: val(fd, "tagline"), description: "", demo: val(fd, "demo"), repo: "", team: nm, submitter: nm }); save(); ui.vflash = "Your project was added 🎉"; render(); }
};

/* ---------- wiring ---------- */
document.addEventListener("click", function (e) {
  var t = e.target.closest("[data-act]"); if (!t) { var s = e.target.closest("[data-select]"); if (s) s.select(); return; }
  var a = acts[t.dataset.act]; if (!a) return;
  if (t.tagName === "A") e.preventDefault();
  if (t.dataset.act === "flip" && e.target.closest("a")) return;
  a(t.dataset, t, e);
});
document.addEventListener("submit", function (e) { var f = e.target.closest("form[data-form]"); if (!f) return; e.preventDefault(); var fn = forms[f.dataset.form]; if (fn) fn(new FormData(f), f.dataset, f); });
document.addEventListener("change", function (e) { var t = e.target.closest("[data-change]"); if (t && changes[t.dataset.change]) changes[t.dataset.change](t.value, t); });
document.addEventListener("keydown", function (e) { var t = e.target.closest && e.target.closest(".flip"); if (t && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); acts.flip({}, t); } });

/* ---------- shared links: #v-handle, #v-handle-mode, #v-handle-event-name ---------- */
async function route() {
  var h = location.hash || ""; if (h.indexOf("#v-") !== 0) return;
  var parts = h.slice(3).split("-"), mode = "ALL", evSlug = "", ei = parts.indexOf("event");
  if (ei > 0) { evSlug = parts.slice(ei + 1).join("-"); parts = parts.slice(0, ei); }
  else if (parts.length > 1 && MODES.map(function (m) { return m.toLowerCase(); }).indexOf(parts[parts.length - 1]) >= 0) { mode = parts.pop().toUpperCase(); }
  var handle = parts.join("-"), src = null;
  if (S.setup && S.me.handle === handle) src = ownSource();
  else if (DB) {
    try { var q = await DB.db.collection("pages").where("handle", "==", handle).limit(1).get(); if (q.size) src = snapSource(JSON.parse(q.docs[0].data().data)); } catch (e) { }
  }
  if (!src) { ui.visitor = null; ui.notFound = handle; render(); $("#phone").innerHTML = '<div class="screen center"><div class="logo">F</div><h1 style="text-align:center">Page not found</h1><p class="muted" style="text-align:center">No published page for “' + esc(handle) + '”. Ask the owner to tap Publish my page.</p><button data-act="exitVisit">Open my app</button></div>'; return; }
  ui.visitor = { mode: src.cfg(mode) && (mode === "ALL" || srcHas(src, mode)) ? mode : "ALL", pane: "me", src: src, event: "" };
  if (evSlug) { var ev = src.events.filter(function (x) { return slug(x.name) === evSlug; })[0]; if (ev) ui.visitor.event = ev.id; }
  logScanIfOwn(src, ui.visitor.mode);
  render();
}
function logScanIfOwn(src, mode) { if (src.own) { logScan(mode, "qr"); save(); } }
window.addEventListener("hashchange", route);

/* ---------- start ---------- */
S = loadLocal(); render(); route();
connectDb().then(function (changed) { if (changed) { render(); } route(); });
