/* Screens, part 3: what a visitor sees after a scan. */
"use strict";

function ownSource() { return { me: S.me, cfg: cfg, resources: S.resources, team: S.team, career: S.career, jobs: S.jobs, events: S.events, projects: S.projects, own: true }; }
function snapSource(d) { return { me: d.me, cfg: function (m) { return (d.modes || {})[m] || { fields: {} }; }, resources: d.resources || [], team: d.team || [], career: d.career || [], jobs: d.jobs || [], events: d.events || [], projects: d.projects || [], own: false }; }
function srcHas(src, mode) {
  if (mode === "ALL") return true;
  var c = src.cfg(mode); if (!c || c.enabled === false) return false;
  return !!((c.kitText || "").trim() || (c.intro || "").trim() || Object.keys(c.fields || {}).some(function (k) { return String(c.fields[k]).trim(); }) || src.resources.some(function (r) { return r.modes.indexOf(mode) >= 0; }) || (mode === "RECRUITER" && src.jobs.some(function (j) { return j.open; })) || (mode === "HACKATHON" && (src.projects.some(function (p) { return !p.eventId; }) || src.events.length)));
}

function vVisitor() {
  var v = ui.visitor, src = v.src, ro = !src.own, mode = v.mode, me = src.me, c = src.cfg(mode), info = MODE_INFO[mode];
  if (v.event) return vEventVisitor();
  var bar = '<div class="sbar"><span>' + (ro ? "Viewing " + esc(me.first + " " + me.last) + "'s page" : "Visitor view · simulated") + '</span><button data-act="exitVisit">' + (ro ? "Close" : "Exit") + "</button></div>";
  // approval gate
  if (c.approval && !ui.unlocked[(me.handle || "") + mode]) {
    return bar + '<div class="screen"><div class="hero" style="background:' + gradient(me.theme) + '">' + av(80, me) + "<h1>" + esc(me.first + " " + me.last) + "</h1><div>" + esc(byline(me.headline, me.company)) + '</div><span class="pill">🔒 ' + info.label + " · private</span></div>" +
      (ui.vflash ? '<div class="ok">' + esc(ui.vflash) + "</div>" : "") + (ro ? '<div class="note">This page needs the owner\'s approval. In the full app, a request form reaches the owner.</div>' : '<form class="card" data-form="vRequest"><h3>Request access</h3><p class="muted" style="margin-top:0">' + esc(me.first) + " approves each person before sharing the " + info.label.toLowerCase() + " page.</p><div class=\"row\"><input name=\"first\" placeholder=\"First name\" required><input name=\"last\" placeholder=\"Last name\" required></div><input name=\"email\" type=\"email\" placeholder=\"Your email\" required><input name=\"note\" placeholder=\"Why would you like access? (optional)\"><button>Request access</button></form>") +
      '<button class="ghost" data-act="unlock">' + (ro ? "Continue" : "I am the owner: view anyway") + "</button></div>";
  }
  var kitText = c.kitText || "", f = c.fields || {}, fd = info.fields.filter(function (x) { return String(f[x.k] || "").trim(); });
  var inKit = function (r) { return (mode === "ALL" || r.modes.indexOf(mode) >= 0) && !!info.kinds[r.kind]; };
  var grp = function (k) { return src.resources.filter(function (r) { return r.kind === k && inKit(r); }); };
  var openJobs = src.jobs.filter(function (j) { return j.open; });
  var shownCareer = mode === "ALL" || me.hireModes.indexOf(mode) >= 0;
  var link = function (r) { return r.gated ? lockedRes(r, ro) : '<a class="btn ghost" style="margin-bottom:8px;text-align:left" href="' + esc(r.url) + '" target="_blank" rel="noopener">' + (r.kind === "DEMO" ? "▶ " : "📎 ") + esc(r.title) + (r.tags ? '<span style="display:block;font-size:12px;opacity:.7;font-weight:400">' + esc(listItems(r.tags).map(function (t) { return "#" + t; }).join("  ")) + "</span>" : "") + "</a>"; };
  var pages = [];

  // Me
  var vis = MODES.filter(function (m) { return m !== "ALL" && srcHas(src, m); });
  var me1 = '<div class="hero" style="background:' + gradient(me.theme) + '">' + av(84, me) + "<h1>" + esc(me.first + " " + me.last) + "</h1><div>" + esc(byline(me.headline, me.company)) + '</div><span class="pill" style="margin-top:6px">' + info.icon + " " + info.label + "</span>" +
    (mode === "RECRUITER" && openJobs.length ? '<div><span class="pill" style="background:#fff;color:#0b7a4b">🟢 Hiring · ' + openJobs.length + " open role" + (openJobs.length === 1 ? "" : "s") + "</span></div>" : "") + (me.bio ? '<p style="margin:6px 0 4px;opacity:.92">' + esc(me.bio) + "</p>" : "") +
    (mode === "RECRUITER" && openJobs.length ? '<button data-act="vpane" data-p="roles">See open roles (' + openJobs.length + ")</button>" : "") + (c.booking ? '<a class="btn" style="margin-top:8px" href="' + esc(c.booking) + '" target="_blank" rel="noopener">' + esc(c.cta || info.cta) + "</a>" : "") +
    (ro ? '<button class="ghost" data-act="saveCard">💾 Save card</button>' : "") + (me.socials.linkedin ? '<a class="btn ghost" style="margin-top:8px" href="' + esc(me.socials.linkedin) + '" target="_blank" rel="noopener">in Connect on LinkedIn</a>' : "") + "</div>";
  if (c.intro) me1 += '<div class="card" style="background:var(--chip)">👋 ' + esc(c.intro) + "</div>";
  if (vis.length > 1 || (mode === "ALL" && vis.length)) me1 += '<div class="card"><b>I am a…</b><select data-change="vmode" style="margin-top:8px"><option value="">' + (mode === "ALL" ? "Choose who you are" : "Switch to another view") + "</option>" + vis.map(function (m) { return '<option value="' + m + '"' + (m === mode ? " selected" : "") + ">" + MODE_INFO[m].icon + " " + MODE_INFO[m].label + "</option>"; }).join("") + (mode !== "ALL" ? '<option value="ALL">✨ Everything</option>' : "") + "</select></div>";
  pages.push(["me", "Me", me1]);

  // Kit pane
  if (kitText || fd.length || grp("DECK").length) {
    var k1 = (kitText ? '<div class="card"><h3>' + info.about + '</h3><div style="white-space:pre-wrap">' + esc(kitText) + "</div></div>" : "") + (fd.length ? '<div class="card"><h3>Details</h3>' + fd.filter(function (x) { return x.t !== "url"; }).map(function (x) {
      var val = f[x.k]; return '<div style="margin-bottom:10px"><div class="muted">' + esc(x.l) + "</div>" + (x.k === "process" ? '<ol style="margin:4px 0 0;padding-left:20px">' + String(val).split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ol>" : x.t === "list" ? "<div>" + pills(listItems(val)) + "</div>" : '<div style="white-space:pre-wrap">' + esc(val) + "</div>") + "</div>";
    }).join("") + fd.filter(function (x) { return x.t === "url"; }).map(function (x) { return '<a class="btn ghost" style="margin-bottom:8px" href="' + esc(f[x.k]) + '" target="_blank" rel="noopener">🔗 ' + esc(x.l) + " ↗</a>"; }).join("") + "</div>" : "") +
      (grp("DECK").length ? '<div class="card"><h3>' + info.kinds.DECK + "</h3>" + grp("DECK").map(link).join("") + "</div>" : "");
    pages.push(["kit", info.pane, k1]);
  }
  if (grp("DEMO").length) pages.push(["demo", "Demo", '<div class="card"><h3>' + info.kinds.DEMO + "</h3>" + grp("DEMO").map(link).join("") + '</div><div class="note">The full app plays YouTube, Vimeo, Loom and video links right on the page.</div>']);
  if (mode === "RECRUITER" && openJobs.length) pages.push(["roles", "Open roles (" + openJobs.length + ")", openJobs.map(function (j) {
    return '<div class="card"><b style="font-size:16px">' + esc(j.title) + '</b><div class="muted">' + esc([j.location, j.workType, j.employment].filter(Boolean).join(" · ")) + "</div>" + (j.salary ? '<div style="margin-top:4px">💰 ' + esc(j.salary) + "</div>" : "") + (j.description ? '<p style="white-space:pre-wrap;margin:8px 0">' + esc(j.description.length > 220 ? j.description.slice(0, 220) + "…" : j.description) + "</p>" : "") + (j.skills ? "<div>" + pills(listItems(j.skills)) + "</div>" : "") + '<button data-act="applyTo" data-id="' + j.id + '" style="margin-top:8px">Apply →</button></div>';
  }).join("")]);
  if (mode === "HACKATHON" || mode === "ALL") {
    var own = src.projects.filter(function (p) { return !p.eventId; });
    if (own.length) pages.push(["projects", "Projects", own.map(function (p) { return projectCard(p); }).join("")]);
    if (src.events.length) pages.push(["events", "Events", src.events.map(function (e) { return '<button class="menu" data-act="visitEvent" data-id="' + e.id + '"><span class="ico">🏆</span><span style="flex:1;min-width:0"><b>' + esc(e.name) + '</b><span class="s">' + esc(e.location || "Details soon") + '</span></span><span class="pill ' + (e.open ? "on" : "") + '" style="margin:0">' + (e.open ? "Open" : "Closed") + "</span></button>"; }).join("")]);
  }
  // Hire me
  var jobsC = shownCareer ? src.career.filter(function (x) { return x.type === "EXPERIENCE"; }).sort(function (a, b) { return (b.start || "").localeCompare(a.start || ""); }) : [], edu = shownCareer ? src.career.filter(function (x) { return x.type === "EDUCATION"; }).sort(function (a, b) { return (b.start || "").localeCompare(a.start || ""); }) : [];
  var skills = shownCareer ? listItems(me.skills) : [], openTo = shownCareer ? me.openTo : "", tl = function (x) { return '<div class="tl"><b>' + esc(x.title) + "</b><div>" + esc(x.org) + (x.location ? " · " + esc(x.location) : "") + "</div>" + (fmtRange(x.start, x.end) ? '<div class="muted">' + esc(fmtRange(x.start, x.end)) + "</div>" : "") + (x.description ? '<div class="muted" style="white-space:pre-wrap;margin-top:4px">' + esc(x.description) + "</div>" : "") + "</div>"; };
  var hasFiles = shownCareer && (me.resumeUrl || me.socials.portfolio);
  if (openTo || skills.length || jobsC.length || edu.length || hasFiles) pages.push(["hire", "Hire me", ((openTo || skills.length) ? '<div class="card">' + (openTo ? '<span class="pill on" style="margin:0 0 8px">' + (openTo === "Not looking" ? "⚪" : "🟢") + " " + esc(openTo) + "</span>" : "") + (skills.length ? "<h3>Skills</h3><div>" + pills(skills) + "</div>" : "") + "</div>" : "") + (jobsC.length ? '<div class="card"><h3>💼 Experience</h3>' + jobsC.map(tl).join("") + "</div>" : "") + (edu.length ? '<div class="card"><h3>🎓 Education</h3>' + edu.map(tl).join("") + "</div>" : "") + (hasFiles ? '<div class="card">' + (me.resumeUrl ? '<a class="btn ghost" style="margin-bottom:8px" href="' + esc(me.resumeUrl) + '" target="_blank" rel="noopener">📄 Resume</a>' : "") + (me.socials.portfolio ? '<a class="btn ghost" href="' + esc(me.socials.portfolio) + '" target="_blank" rel="noopener">🗂️ Portfolio</a>' : "") + "</div>" : "")]);
  if (src.team.length) pages.push(["team", "Team", '<div class="card"><h3>Team' + (me.company ? " at " + esc(me.company) : "") + "</h3>" + src.team.map(function (t) { return '<a href="' + esc(t.link || "#") + '" target="_blank" rel="noopener" style="color:inherit;display:flex;align-items:center;gap:12px;padding:8px 0"><div class="avatar" style="width:44px;height:44px">' + esc(t.name.split(" ").map(function (w) { return w[0]; }).join("").slice(0, 2)) + '</div><div style="flex:1"><b>' + esc(t.name) + '</b><div class="muted">' + esc(t.role) + "</div></div></a>"; }).join("") + "</div>"]);
  var docs = grp("DOC"), sup = grp("SUPPORT");
  if (docs.length || sup.length) {
    var tags = []; sup.forEach(function (r) { listItems(r.tags).forEach(function (t) { if (tags.indexOf(t) < 0) tags.push(t); }); });
    var act = ui.vtag && tags.indexOf(ui.vtag) >= 0 ? ui.vtag : "", shown = act ? sup.filter(function (r) { return listItems(r.tags).indexOf(act) >= 0; }) : sup;
    pages.push(["docs", "Docs", (docs.length ? '<div class="card"><h3>' + info.kinds.DOC + "</h3>" + docs.map(link).join("") + "</div>" : "") + (sup.length ? '<div class="card"><h3>' + info.kinds.SUPPORT + "</h3>" + (tags.length ? '<div class="chips"><button class="pill ' + (!act ? "on" : "") + '" data-act="vtag" data-t="" style="width:auto;border:0;color:' + (!act ? "#fff" : "var(--ink)") + '">All</button>' + tags.map(function (t) { return '<button class="pill ' + (act === t ? "on" : "") + '" data-act="vtag" data-t="' + esc(t) + '" style="width:auto;border:0;color:' + (act === t ? "#fff" : "var(--ink)") + '">#' + esc(t) + "</button>"; }).join("") + "</div>" : "") + shown.map(link).join("") + "</div>" : "")]);
  }
  // Connect
  var soc = SOCIALS.filter(function (s) { return me.socials[s.k]; }), has = me.company || me.website || me.email || me.phone || soc.length;
  pages.push(["connect", "Connect", (has ? '<div class="card"><h3>Contact</h3>' + (me.company ? "<div>🏢 " + esc(me.company) + "</div>" : "") + (me.phone ? "<div>📞 " + esc(me.phone) + "</div>" : "") + (me.email ? '<div>✉ <a href="mailto:' + esc(me.email) + '">' + esc(me.email) + "</a></div>" : "") + (me.website ? '<div>🌐 <a href="' + esc(me.website) + '" target="_blank" rel="noopener">' + esc(me.website.replace(/^https?:\/\//, "")) + "</a></div>" : "") + (soc.length ? '<div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:10px">' + soc.map(function (s) { return '<a href="' + esc(me.socials[s.k]) + '" target="_blank" rel="noopener" title="' + s.l + '">' + socialBadge(s.k, 42) + "</a>"; }).join("") + "</div>" : "") + "</div>" : "") +
    (ro ? '<div class="note">Sharing your details back reaches the owner in the full app.</div>' : '<form class="card" data-form="vConnect"><h3>Share your details back</h3><div class="row"><input name="first" placeholder="First name" required><input name="last" placeholder="Last name" required></div><input name="email" type="email" placeholder="Email" required><input name="company" placeholder="Company"><button>Send</button><p class="muted" style="margin-bottom:0">By sending, you agree ' + esc(me.first) + " may contact you.</p></form>")]);
  if (mode === "RECRUITER") { var ri = pages.map(function (p) { return p[0]; }).indexOf("roles"); if (ri > 1) pages.splice(1, 0, pages.splice(ri, 1)[0]); }
  // apply / event register sub-pane
  if (v.pane === "apply") {
    var j = src.jobs.filter(function (x) { return x.id === v.jobId; })[0];
    if (j) pages = [["apply", "Apply", '<div class="hero" style="background:' + gradient(me.theme) + '"><span class="pill">🎯 ' + esc(me.company || me.first) + " is hiring</span><h1>" + esc(j.title) + "</h1><div>" + esc([j.location, j.workType, j.employment].filter(Boolean).join(" · ")) + "</div>" + (j.salary ? "<div>💰 " + esc(j.salary) + "</div>" : "") + "</div>" + (j.description ? '<div class="card" style="white-space:pre-wrap">' + esc(j.description) + "</div>" : "") +
      (ro ? '<div class="note">Applications reach the recruiter in the full app.</div>' : (ui.vflash ? '<div class="ok">' + esc(ui.vflash) + "</div>" : "") + '<form class="card" data-form="vApply" data-id="' + j.id + '"><h3>Apply for this role</h3><div class="row"><input name="first" placeholder="First name" required><input name="last" placeholder="Last name" required></div><input name="email" type="email" placeholder="Email" required><input name="phone" type="tel" placeholder="Phone (optional)"><input name="resume" type="url" placeholder="Link to your resume or portfolio"><textarea name="note" rows="3" placeholder="Why are you a good fit? (optional)"></textarea><button>Send application</button></form>') + '<button class="ghost" data-act="vpane" data-p="roles">← All open roles</button>']];
  }
  var pane = pages.filter(function (p) { return p[0] === v.pane; })[0] ? v.pane : pages[0][0];
  var tabs = '<div class="tabs">' + pages.map(function (p) { return '<button data-act="vpane" data-p="' + p[0] + '" class="' + (p[0] === pane ? "on" : "") + '">' + esc(p[1]) + "</button>"; }).join("") + "</div>";
  return bar + (pages.length > 1 ? tabs : "") + '<div class="screen">' + pages.filter(function (p) { return p[0] === pane; })[0][2] + "</div>";
}
function lockedRes(r, ro) {
  return '<div class="card" style="background:var(--soft);padding:10px;margin-bottom:8px"><b>🔒 ' + esc(r.title) + '</b> <span class="muted">· needs approval</span>' + (ro ? "" : '<form data-form="vFileReq" data-id="' + r.id + '" style="margin-top:8px"><div class="row"><input name="first" placeholder="First name" required><input name="last" placeholder="Last name" required></div><input name="email" type="email" placeholder="Your email" required><button>Request access</button></form>') + "</div>";
}
function vEventVisitor() {
  var v = ui.visitor, src = v.src, ev = src.events.filter(function (e) { return e.id === v.event; })[0], me = src.me;
  if (!ev) { v.event = ""; return vVisitor(); }
  var ro = !src.own, c1 = ev.color1 || "#3b5bdb", c2 = ev.color2 || "#7048e8", jobs = src.jobs.filter(function (j) { return j.eventId === ev.id && j.open; });
  var mineTicket = ui.myTicket && S.attendees.filter(function (a) { return a.id === ui.myTicket && a.eventId === ev.id; })[0];
  var bar = '<div class="sbar"><span>' + (ro ? "Event page" : "Visitor view · simulated") + '</span><button data-act="exitEvent">Back</button></div>';
  var body = '<div class="hero" style="background:linear-gradient(135deg,' + c1 + "," + c2 + ')"><span class="pill">🏆 ' + (ev.open ? "Open" : "Closed") + "</span><h1>" + esc(ev.name) + "</h1>" + (ev.location ? "<div>📍 " + esc(ev.location) + "</div>" : "") + "<div>Organized by " + esc(me.first + " " + me.last) + "</div></div>" +
    (ev.description ? '<div class="card" style="white-space:pre-wrap">' + esc(ev.description) + "</div>" : "") + (ev.agenda ? '<div class="card"><h3>Agenda</h3><div style="white-space:pre-wrap">' + esc(ev.agenda) + "</div></div>" : "");
  if (mineTicket) body += '<div class="card" style="text-align:center"><h3>🎟 Your ticket</h3><b>' + esc(mineTicket.name) + '</b><div class="qrbig">' + qrSvg(mineTicket.code, 4) + '</div><div class="muted">' + esc(mineTicket.code) + " · show this at the entrance</div>" + (mineTicket.checkedInAt ? '<div class="ok" style="margin:8px 0 0">✅ Checked in</div>' : "") + "</div>";
  else if (ro) body += '<div class="note">Registration reaches the organizer in the full app.</div>';
  else if (ev.open) body += '<form class="card" data-form="vRegister" data-id="' + ev.id + '"><h3>Register</h3><div class="row"><input name="first" placeholder="First name" required><input name="last" placeholder="Last name" required></div><input name="email" type="email" placeholder="Email" required><input name="company" placeholder="Company or college (optional)">' + (jobs.length ? '<label class="f">Roles you would like to talk about (optional)</label>' + jobs.map(function (j) { return '<label style="display:block;margin:4px 0"><input type="checkbox" name="job_' + j.id + '">' + esc(j.title) + "</label>"; }).join("") : "") + "<button>Get my ticket</button></form>";
  if (jobs.length) body += "<h2>Hiring at this event</h2>" + jobs.map(function (j) { return '<div class="card"><b>' + esc(j.title) + '</b><div class="muted">' + esc([j.location, j.workType, j.employment].filter(Boolean).join(" · ")) + "</div></div>"; }).join("");
  var ps = src.projects.filter(function (p) { return p.eventId === ev.id; });
  body += "<h2>Projects (" + ps.length + ")</h2>" + (ps.length ? ps.map(function (p) { return projectCard(p); }).join("") : '<div class="card muted">No projects yet.</div>');
  if (!ro && ev.open) body += '<form class="card" data-form="vProject" data-id="' + ev.id + '"><h3>Add your project</h3><input name="name" placeholder="Project name" required><input name="tagline" placeholder="One-line pitch"><input name="demo" type="url" placeholder="Demo link"><div class="row"><input name="first" placeholder="Your first name" required><input name="last" placeholder="Last name" required></div><button>Submit project</button></form>';
  return bar + '<div class="screen">' + (ui.vflash ? '<div class="ok">' + esc(ui.vflash) + "</div>" : "") + body + "</div>";
}
