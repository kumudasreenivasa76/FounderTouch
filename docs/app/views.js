/* Screens, part 1: helpers, onboarding, Share, Contacts. Each returns an HTML string. */
"use strict";

var ui = { tab: "share", page: null, shareSel: "FOUNDER", flipped: false, kitMode: "FOUNDER", kitKind: "", visitor: null, flash: "", wizard: 0, eventId: "", jobId: "", ctab: "" };

/* ---------- little builders ---------- */
function av(size, me) {
  var m = me || S.me, inner = avatarSvg(m.avatar, size - 6);
  return '<div class="avatar" style="width:' + size + 'px;height:' + size + 'px">' + inner + "</div>";
}
function fld(label, name, val, o) {
  o = o || {}; var v = esc(val == null ? "" : val), ph = o.ph ? ' placeholder="' + esc(o.ph) + '"' : "", req = o.req ? " required" : "";
  var ctl = o.t === "textarea" ? '<textarea name="' + name + '" rows="' + (o.rows || 3) + '"' + ph + ">" + v + "</textarea>"
    : o.t === "select" ? '<select name="' + name + '"><option value="">' + esc(o.none || "Not set") + "</option>" + o.opts.map(function (x) { return '<option value="' + esc(x) + '"' + (x === val ? " selected" : "") + ">" + esc(x) + "</option>"; }).join("") + "</select>"
      : '<input name="' + name + '" type="' + (o.t || "text") + '" value="' + v + '"' + ph + req + (o.t === "url" ? ' inputmode="url" autocapitalize="none"' : "") + ">";
  return (label ? '<label class="f">' + esc(label) + "</label>" : "") + ctl;
}
function pills(arr) { return arr.map(function (x) { return '<span class="pill">' + esc(x) + "</span>"; }).join(""); }
function menuRow(act, attrs, icon, title, sub) {
  return '<button class="menu" data-act="' + act + '" ' + (attrs || "") + '><span class="ico">' + icon + '</span><span style="flex:1;min-width:0"><b>' + title + '</b><span class="s">' + sub + '</span></span><span class="muted">›</span></button>';
}
function backHead(title, to) { return '<div class="head"><button class="ghost sm" data-act="back" ' + (to ? 'data-to="' + to + '"' : "") + ">← Back</button><b style=\"font-size:17px\">" + title + "</b></div>"; }
function flash() { var f = ui.flash; ui.flash = ""; return f ? '<div class="ok">' + esc(f) + "</div>" : ""; }
function tabbar() {
  var T = [["share", "▦", "Share"], ["events", "◈", "Events"], ["contacts", "☰", "Contacts"], ["profile", "◉", "Profile"]];
  return '<nav class="tabbar">' + T.map(function (t) { return '<button data-act="tab" data-tab="' + t[0] + '" class="' + (ui.tab === t[0] ? "on" : "") + '"><b>' + t[1] + "</b>" + t[2] + "</button>"; }).join("") + "</nav>";
}
function shell(head, body) { return (head || "") + '<div class="screen">' + body + "</div>" + tabbar(); }

function shareUrl(mode) { return location.href.split("#")[0] + "#v-" + (S.me.handle || "me") + (mode && mode !== "ALL" ? "-" + mode.toLowerCase() : ""); }

/* ---------- onboarding ---------- */
function vOnboarding() {
  var m = S.me, w = ui.wizard, steps = [
    '<h1>Tell us about you</h1><p class="muted">This is what people see when they scan you.</p><div class="row"><div>' + fld("First name", "first", m.first, { req: 1 }) + "</div><div>" + fld("Last name", "last", m.last, { req: 1 }) + "</div></div>" + fld("Headline", "headline", m.headline, { ph: "e.g. Founder & CEO", req: 1 }) + fld("Company name", "company", m.company) + fld("Phone", "phone", m.phone, { t: "tel" }),
    '<h1>Your public link</h1><p class="muted">Pick a handle and a short bio.</p>' + fld("Handle", "handle", m.handle, { ph: "your-name" }) + fld("Short bio", "bio", m.bio, { t: "textarea", ph: "What are you building?" }),
    '<h1>What describes you?</h1><p class="muted">Pick the pages you want to share. Each asks only for what it needs.</p>' + MODES.filter(function (x) { return x !== "ALL"; }).map(function (x) {
      return '<label class="card" style="display:flex;align-items:center;padding:10px;margin-bottom:8px"><input type="checkbox" name="mode_' + x + '"' + (x === "FOUNDER" ? " checked" : "") + '><span><b>' + MODE_INFO[x].icon + " " + MODE_INFO[x].label + '</b><br><span class="muted">' + MODE_INFO[x].blurb + "</span></span></label>";
    }).join("")];
  var body = '<div style="display:flex;gap:6px;margin-bottom:14px">' + [0, 1, 2].map(function (i) { return '<i style="flex:1;height:5px;border-radius:9px;background:' + (i <= w ? "var(--accent)" : "var(--line)") + '"></i>'; }).join("") + "</div>" +
    '<form data-form="wizard">' + steps.map(function (s, i) { return '<div class="' + (i === w ? "" : "hide") + '">' + s + "</div>"; }).join("") +
    '<div class="row" style="margin-top:10px">' + (w > 0 ? '<button type="button" class="ghost" data-act="wiz" data-d="-1">Back</button>' : "") + (w < 2 ? '<button type="button" data-act="wiz" data-d="1">Next</button>' : "<button>Finish</button>") + "</div></form>" +
    '<p class="muted" style="text-align:center;margin-top:16px">Just looking? <a href="#" data-act="sample">Load a filled-in sample account</a></p>';
  return '<div class="screen center"><div class="logo">F</div>' + body + "</div>";
}

/* ---------- Share ---------- */
function vShare() {
  var vis = visibleModes(), notAdded = MODES.filter(function (m) { return m !== "ALL" && vis.indexOf(m) < 0; });
  var opts = vis.map(function (m) { return [m, MODE_INFO[m].icon + " " + MODE_INFO[m].label]; }).concat([["_add", "＋ Add a mode"], ["_tap", "📲 Tap (NFC)"], ["_wallet", "👛 Wallet"]]);
  if (!opts.some(function (o) { return o[0] === ui.shareSel; })) ui.shareSel = vis[0];
  var sel = ui.shareSel, scans = S.scans.length, taps = S.scans.filter(function (x) { return x.src === "nfc"; }).length;
  var head = '<div class="head">' + av(46) + '<div style="flex:1;min-width:0"><b style="font-size:17px">Hi, ' + esc(S.me.first || "there") + ' 👋</b><div class="muted">' + scans + " scans · " + taps + " taps · " + S.contacts.length + " contacts</div></div></div>" +
    '<div class="picker"><select data-change="shareSel" aria-label="Choose a page">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === sel ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + "</select></div>";
  var body = flash();
  if (sel === "_add") {
    body += "<h2>Add a mode</h2><p class=\"muted\">A mode shows up for visitors once you add something to it.</p>" + (notAdded.length ? notAdded.map(function (m) { return menuRow("kit", 'data-mode="' + m + '"', MODE_INFO[m].icon, MODE_INFO[m].label, MODE_INFO[m].blurb); }).join("") : '<div class="card muted">You have added every mode.</div>');
  } else if (sel === "_tap") {
    body += '<div style="text-align:center;font-size:44px;margin-top:6px">📲</div><h2 style="text-align:center">Tap to share</h2><p class="muted" style="text-align:center">Write your link to an NFC card or sticker. People tap it with their phone and your page opens.</p>' +
      vis.map(function (m) { return '<label class="f">' + MODE_INFO[m].icon + " " + MODE_INFO[m].label + '</label><input readonly value="' + esc(shareUrl(m)) + '" data-select>'; }).join("") +
      '<div class="note">Writing to a tag needs the real app (Chrome on Android over HTTPS). Here you can copy the link and write it with any NFC tag app.</div>';
  } else if (sel === "_wallet") {
    body += "<h2>Wallet</h2>" + '<div class="card"><b>Add my card to my phone</b><p class="muted" style="margin:6px 0 0">Google Wallet needs your own Wallet API keys and Apple Wallet needs a paid developer certificate, so neither is available in this in-browser version. They are wired up in the full app.</p></div>' +
      "<h3>Saved cards (" + S.saved.length + ")</h3>" + (S.saved.length ? S.saved.map(function (c) { return '<div class="card" style="display:flex;align-items:center;gap:10px"><div class="avatar" style="width:42px;height:42px">' + esc(c.name.split(" ").map(function (w) { return w[0]; }).join("").slice(0, 2)) + '</div><div style="flex:1;min-width:0"><b>' + esc(c.name) + '</b><div class="muted">' + esc(c.headline) + '</div></div><button class="ghost sm" data-act="unsave" data-id="' + c.id + '">Remove</button></div>'; }).join("") : '<div class="card muted">Cards you save from other people\'s pages appear here.</div>') +
      '<div class="note">Open someone\'s page link (it ends in <b>#v-their-name</b>) and tap <b>Save card</b>.</div>';
  } else {
    body += vShareMode(sel);
  }
  return shell(head, body);
}
function vShareMode(mode) {
  var info = MODE_INFO[mode], c = cfg(mode), m = S.me, url = shareUrl(mode), th = THEMES[m.theme] || THEMES.sunset;
  var lines = [m.phone && "📞 " + m.phone, m.email && "✉️ " + m.email, m.website && "🌐 " + m.website.replace(/^https?:\/\//, "")].filter(Boolean);
  var soc = SOCIALS.filter(function (s) { return m.socials[s.k]; }).map(function (s) { return '<a href="' + esc(m.socials[s.k]) + '" target="_blank" rel="noopener" title="' + s.l + '">' + socialIcon(s.k, 15) + "</a>"; }).join("");
  var o = '<div class="flip' + (ui.flipped ? " on" : "") + '" data-act="flip" role="button" tabindex="0" aria-label="Flip the card"><div class="flip-in">' +
    '<div class="face" style="background:' + gradient(m.theme) + '"><div class="face-top">' + av(56) + '<span class="mb">' + info.icon + " " + info.label + '</span></div><div class="nm">' + esc(fullName()) + '</div><div class="sb">' + esc(byline(m.headline, m.company)) + '</div><div class="qr">' + qrSvg(url, 4) + "</div></div>" +
    '<div class="face back" style="background:linear-gradient(135deg,' + th[2] + "," + th[1] + ')"><div class="nm" style="margin-top:0;font-size:17px;max-width:100%">' + esc(fullName()) + '</div><div class="lines">' + (lines.length ? lines.map(esc).join("<br>") : "Add a phone, email or website in Profile.") + '</div><div class="soc">' + soc + "</div></div></div></div>";
  o += '<button class="ghost" style="margin-top:10px" data-act="flip">↻ Flip card</button>' +
    '<div class="row" style="margin-top:8px"><button class="ghost" data-act="copy" data-text="' + esc(url) + '">Copy link</button><button data-act="visit" data-mode="' + mode + '">Preview as visitor</button></div>' +
    '<div class="row" style="margin-top:8px"><button class="ghost" data-act="publish">' + (ui.published ? "✓ Page published" : "Publish my page to share") + '</button></div><p class="muted" style="margin:4px 0 12px">' + (ui.publishMsg || "Publishing lets other people who open this page's link see your page.") + "</p>";
  var nd = needs(mode), todo = nd.filter(function (n) { return !n.ok; });
  o += '<div class="card" style="border-color:' + (todo.length ? "#ffd8a8" : "#b2f2bb") + '"><b>' + info.icon + " " + (todo.length ? "Finish your " + info.label + " page" : info.label + " page is ready ✓") + '</b><div class="muted" style="margin-bottom:4px">' + info.blurb + "</div>" +
    nd.map(function (n) { return '<button class="menu" style="border:0;padding:5px 0;margin:0;background:none;color:' + (n.ok ? "var(--muted)" : "var(--ink)") + '" data-act="' + n.go + '" data-mode="' + (n.mode || "") + '" data-kind="' + (n.kind || "") + '"><span>' + (n.ok ? "✅" : "➕") + '</span><span style="flex:1;' + (n.ok ? "text-decoration:line-through" : "") + '">' + esc(n.label) + "</span></button>"; }).join("") + "</div>";
  // last 7 days
  var days = [], now = new Date(); now.setHours(0, 0, 0, 0);
  for (var i = 6; i >= 0; i--) { var d = new Date(now); d.setDate(d.getDate() - i); days.push(d); }
  var mine = S.scans.filter(function (x) { return x.mode === mode; }), counts = days.map(function (d) { return mine.filter(function (x) { var t = new Date(x.t); t.setHours(0, 0, 0, 0); return t.getTime() === d.getTime(); }).length; }), mx = Math.max.apply(null, counts.concat([1]));
  o += '<div class="card"><b>Last 7 days</b> <span class="muted">· ' + mine.length + ' scans</span><div class="bars">' + counts.map(function (n, i) { return '<div class="' + (i === 6 ? "hi" : "") + '" style="height:' + n / mx * 100 + '%"></div>'; }).join("") + '</div><div class="bars-l">' + days.map(function (d) { return "<span>" + "SMTWTFS"[d.getDay()] + "</span>"; }).join("") + "</div></div>";
  o += '<div class="card"><b>Card colour</b><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px">' + Object.keys(THEMES).map(function (k) { return '<button data-act="theme" data-k="' + k + '" aria-label="' + THEMES[k][0] + '" style="width:38px;height:38px;padding:0;border-radius:50%;background:linear-gradient(135deg,' + THEMES[k][1] + "," + THEMES[k][2] + ");border:3px solid " + (m.theme === k ? "var(--ink)" : "var(--panel)") + '"></button>'; }).join("") + "</div></div>";
  var prov = c.booking ? bookingProvider(c.booking) : null;
  o += '<form class="card" data-form="modeSettings" data-mode="' + mode + '"><h3>Settings for ' + info.label + '</h3><label style="display:block;margin:6px 0 2px"><input type="checkbox" name="approval"' + (c.approval ? " checked" : "") + "><b>🔒 Visitors need my approval</b></label>" +
    '<p class="muted" style="margin:0 0 8px">Visitors see only your name and a request form until you approve them in Contacts.</p>' + fld("Intro message", "intro", c.intro, { t: "textarea", rows: 2, ph: "A short hello for " + info.label.toLowerCase() + " visitors" }) + fld("Button label", "cta", c.cta) + fld("Booking link", "booking", c.booking, { t: "url", ph: "Calendly, Cal.com, Google Calendar…" }) +
    '<p class="muted" style="margin:0 0 8px">' + (prov ? "📅 " + esc(prov) + " (opens in a new tab here; the full app shows it inside the page)" : "Paste any scheduling link.") + "</p>" +
    (mode !== "ALL" ? '<label style="display:block;margin:8px 0"><input type="checkbox" name="hide">Hide this mode for now</label>' : "") + "<button>Save settings</button></form>";
  return o;
}

/* ---------- Contacts ---------- */
function vContacts() {
  var o = flash() + "<h1>Contacts</h1>";
  var newN = S.apps.filter(function (a) { return a.status === "NEW"; }).length;
  if (S.apps.length) {
    var jobs = S.jobs.filter(function (j) { return S.apps.some(function (a) { return a.jobId === j.id; }); });
    o += "<h2>🎯 Applicants " + (newN ? '<span class="pill on">' + newN + " new</span>" : "") + "</h2>";
    if (jobs.length > 1) o += '<div class="chips"><button class="pill ' + (!ui.ctab ? "on" : "") + '" data-act="ctab" data-id="" style="width:auto;border:0">All roles</button>' + jobs.map(function (j) { return '<button class="pill ' + (ui.ctab === j.id ? "on" : "") + '" data-act="ctab" data-id="' + j.id + '" style="width:auto;border:0;color:' + (ui.ctab === j.id ? "#fff" : "var(--ink)") + '">' + esc(j.title) + "</button>"; }).join("") + "</div>";
    o += S.apps.filter(function (a) { return !ui.ctab || a.jobId === ui.ctab; }).map(applicantCard).join("");
  }
  if (S.modeReqs.length) {
    o += "<h2>Page access</h2>" + S.modeReqs.map(function (r) {
      var inf = MODE_INFO[r.mode];
      return '<div class="card"><b>' + esc(r.name) + '</b> <span class="muted">wants to view your</span> <b>' + inf.icon + " " + inf.label + '</b> <span class="muted">page</span><div class="muted">' + esc(r.email) + "</div>" + (r.note ? '<div style="margin-top:4px">"' + esc(r.note) + '"</div>' : "") +
        (r.status === "PENDING" ? '<div class="row" style="margin-top:8px"><button class="ghost" data-act="decideMode" data-id="' + r.id + '" data-s="DECLINED">Decline</button><button data-act="decideMode" data-id="' + r.id + '" data-s="APPROVED">Approve</button></div>'
          : '<div style="margin-top:6px"><span class="pill">' + r.status.toLowerCase() + "</span>" + (r.status === "APPROVED" ? ' <button class="ghost sm" data-act="copy" data-text="' + esc(shareUrl(r.mode) + "?access=" + r.id) + '">Copy access link</button>' : "") + "</div>") + "</div>";
    }).join("");
  }
  if (S.fileReqs.length) {
    o += "<h2>File requests</h2>" + S.fileReqs.map(function (r) {
      var f = S.resources.filter(function (x) { return x.id === r.resourceId; })[0];
      return '<div class="card"><b>' + esc(r.name) + '</b> <span class="muted">wants</span> <b>' + esc(f ? f.title : "a file") + '</b><div class="muted">' + esc(r.email) + "</div>" +
        (r.status === "PENDING" ? '<div class="row" style="margin-top:8px"><button class="ghost" data-act="decideFile" data-id="' + r.id + '" data-s="DECLINED">Decline</button><button data-act="decideFile" data-id="' + r.id + '" data-s="APPROVED">Approve</button></div>' : '<div style="margin-top:6px"><span class="pill">' + r.status.toLowerCase() + "</span></div>") + "</div>";
    }).join("");
  }
  o += "<h2>People</h2><p class=\"muted\">" + S.contacts.length + " people shared their details with you</p>" + (S.contacts.length ? S.contacts.map(function (c) {
    var inf = MODE_INFO[c.mode];
    return '<div class="card"><b>' + esc(c.name) + '</b> <span class="pill" style="float:right;margin:0">' + (inf ? inf.label : "") + '</span><div class="muted">' + esc(c.company ? c.company + " · " : "") + esc(c.email) + "</div></div>";
  }).join("") : '<div class="card muted">Nobody yet. People who send their details from your page appear here.</div>');
  o += '<div class="note"><b>Try it:</b> open <b>Preview as visitor</b> on the Share screen and use the forms there. They add real entries here, as a simulated visitor.</div>';
  return shell("", o);
}
function applicantCard(a) {
  var j = S.jobs.filter(function (x) { return x.id === a.jobId; })[0], st = STATUSES.filter(function (x) { return x[0] === a.status; })[0];
  return '<div class="card" style="opacity:' + (a.status === "REJECTED" ? .6 : 1) + '"><div style="display:flex;justify-content:space-between;gap:8px"><div style="min-width:0"><b>' + esc(a.name) + '</b> <span class="muted">for</span> <b>' + esc(j ? j.title : "a role") + '</b></div><span class="pill" style="margin:0;background:' + st[2] + ';color:#fff;height:fit-content">' + st[1] + "</span></div>" +
    '<div class="muted">' + esc(a.email) + (a.phone ? " · " + esc(a.phone) : "") + " · " + new Date(a.at).toLocaleDateString() + "</div>" +
    (a.via ? '<div style="margin:6px 0"><span class="pill on">⚡ FounderTouch profile</span><span class="pill">Open to work</span></div>' : "") + (a.note ? '<div style="margin:6px 0">"' + esc(a.note) + '"</div>' : "") +
    '<div class="row" style="margin:8px 0">' + (a.resume ? '<a class="btn ghost" href="' + esc(a.resume) + '" target="_blank" rel="noopener">📄 Resume link</a>' : "") + '<a class="btn ghost" href="mailto:' + esc(a.email) + '">✉ Email</a></div>' +
    '<div style="display:flex;gap:6px;flex-wrap:wrap">' + STATUSES.map(function (x) { return '<button class="' + (a.status === x[0] ? "" : "ghost") + '" data-act="appStatus" data-id="' + a.id + '" data-s="' + x[0] + '" style="width:auto;padding:6px 11px;font-size:13px;' + (a.status === x[0] ? "background:" + x[2] : "") + '">' + x[1] + "</button>"; }).join("") + "</div></div>";
}
