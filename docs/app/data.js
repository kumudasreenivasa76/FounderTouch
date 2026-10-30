/* FounderTouch (in-browser version): static data and small helpers. */
"use strict";

var MODES = ["FOUNDER", "INVESTOR", "SELLER", "SERVICES", "RECRUITER", "HACKATHON", "BUSINESS", "OTHER", "ALL"];

var MODE_INFO = {
  FOUNDER: { label: "Founder", icon: "🚀", blurb: "I run a startup", cta: "Let's connect", kit: "Founder kit", about: "What we do", hint: "What your product does, in one or two lines", pane: "Startup",
    kinds: { DECK: "Pitch deck", DEMO: "Product demo", DOC: "2-pager", SUPPORT: "Other documents" },
    fields: [{ k: "stage", l: "Stage", t: "select", o: ["Idea", "Pre-seed", "Seed", "Series A", "Series B+", "Bootstrapped", "Profitable"] }, { k: "traction", l: "Traction", t: "textarea", h: "Revenue, users, growth" }, { k: "lookingFor", l: "Looking for", t: "list", h: "investors, hires, customers" }] },
  INVESTOR: { label: "Investor", icon: "💼", blurb: "I invest in startups", cta: "Pitch me", kit: "Investor kit", about: "Investment thesis", hint: "What you look for in a founder and a company", pane: "Portfolio",
    kinds: { DECK: "Fund deck", DOC: "Thesis & one-pager", SUPPORT: "Other documents" },
    fields: [{ k: "type", l: "Investor type", t: "select", o: ["Angel", "VC", "Family office", "Corporate VC", "Accelerator / studio", "Syndicate"] }, { k: "firm", l: "Firm / fund", t: "text" }, { k: "focus", l: "Sectors I invest in", t: "list", h: "fintech, climate, AI" }, { k: "stages", l: "Stages", t: "list", h: "pre-seed, seed" }, { k: "ticket", l: "Typical cheque size", t: "text", h: "$25k to $250k" }, { k: "geography", l: "Geography", t: "text" }, { k: "portfolio", l: "Portfolio companies", t: "list", h: "One per line" }, { k: "portfolioUrl", l: "Portfolio link", t: "url" }, { k: "howToPitch", l: "How to pitch me", t: "textarea" }] },
  SELLER: { label: "Seller", icon: "🛍️", blurb: "I sell products", cta: "Request a quote", kit: "Seller kit", about: "What I sell", hint: "Your products and who they are for", pane: "Products",
    kinds: { DEMO: "Product video", DOC: "Catalog / price list", SUPPORT: "Certificates & other documents" },
    fields: [{ k: "priceRange", l: "Price range", t: "text" }, { k: "minOrder", l: "Minimum order", t: "text" }, { k: "delivery", l: "Delivery & areas", t: "text" }, { k: "payment", l: "Payment terms", t: "text" }, { k: "catalogUrl", l: "Catalog or store link", t: "url" }] },
  SERVICES: { label: "Service Provider", icon: "🛠️", blurb: "I offer services", cta: "Book a consultation", kit: "Service Provider kit", about: "What I offer", hint: "Who you help and how", pane: "Services",
    kinds: { DEMO: "Work sample video", DOC: "Brochure / rate card", SUPPORT: "Case studies & other documents" },
    fields: [{ k: "services", l: "Services offered", t: "list", h: "One per line" }, { k: "rate", l: "Pricing", t: "text" }, { k: "availability", l: "Availability", t: "text" }, { k: "portfolioUrl", l: "Portfolio link", t: "url" }, { k: "clients", l: "Selected clients", t: "list" }] },
  RECRUITER: { label: "Recruiter", icon: "🎯", blurb: "I hire talent", cta: "See open roles", kit: "Recruiter kit", about: "Why join us", hint: "What it is like to work with your company", pane: "Hiring",
    kinds: { DECK: "Company deck", DOC: "Job descriptions", SUPPORT: "Other documents" },
    fields: [{ k: "workType", l: "Work type", t: "select", o: ["On-site", "Hybrid", "Remote"] }, { k: "locations", l: "Locations", t: "text" }, { k: "perks", l: "Perks & benefits", t: "list" }, { k: "process", l: "Hiring process", t: "textarea", h: "One step per line" }, { k: "applyUrl", l: "Careers or apply link", t: "url" }] },
  HACKATHON: { label: "Hackathon", icon: "🏆", blurb: "I hack and organize events", cta: "Team up", kit: "Hackathon kit", about: "About me", hint: "What you build and what you enjoy", pane: "Work",
    kinds: { DECK: "Pitch slides", DEMO: "Demo video", DOC: "Write-up", SUPPORT: "Other documents" },
    fields: [{ k: "role", l: "I am a", t: "select", o: ["Participant", "Organizer", "Mentor", "Judge", "Sponsor"] }, { k: "skills", l: "Skills & stack", t: "list" }, { k: "team", l: "Looking for a team?", t: "select", o: ["Yes", "Maybe", "No"] }, { k: "wins", l: "Past hackathons & wins", t: "textarea" }] },
  BUSINESS: { label: "Business", icon: "🤝", blurb: "I represent a company", cta: "Explore a partnership", kit: "Business kit", about: "What we offer", hint: "What your company does and who it serves", pane: "Company",
    kinds: { DECK: "Company profile", DOC: "Capability statement", SUPPORT: "Other documents" },
    fields: [{ k: "industry", l: "Industry", t: "text" }, { k: "size", l: "Company size", t: "select", o: ["1 to 10", "11 to 50", "51 to 200", "201 to 1,000", "1,000+"] }, { k: "offers", l: "Products & services", t: "list" }, { k: "partnerships", l: "Partnerships we want", t: "textarea" }] },
  OTHER: { label: "Other", icon: "📌", blurb: "Something else", cta: "Get in touch", kit: "My kit", about: "About", hint: "What this page is for", pane: "About",
    kinds: { DECK: "Slides", DEMO: "Videos", DOC: "Documents", SUPPORT: "Other documents" },
    fields: [{ k: "title", l: "Page title", t: "text", h: "Speaker, Student, Artist…" }, { k: "links", l: "Useful links", t: "list" }, { k: "url", l: "Main link", t: "url" }] },
  ALL: { label: "All", icon: "✨", blurb: "Let visitors pick", cta: "Book a meeting", kit: "Everything", about: "About", hint: "A short overview", pane: "Overview",
    kinds: { DECK: "Decks", DEMO: "Demos", DOC: "Documents", SUPPORT: "Supporting documents" }, fields: [] }
};
var KIND_ORDER = ["DECK", "DEMO", "DOC", "SUPPORT"];
var OPEN_TO = ["Open to work", "Open to freelance", "Open to consulting", "Hiring", "Not looking"];
var STATUSES = [["NEW", "New", "#3b5bdb"], ["SHORTLISTED", "Shortlisted", "#7048e8"], ["INTERVIEW", "Interview", "#e8590c"], ["OFFER", "Offer", "#0ca678"], ["REJECTED", "Rejected", "#868e96"]];

var THEMES = {
  indigo: ["Indigo", "#3b5bdb", "#7048e8"], sunset: ["Sunset", "#f76707", "#e03131"], emerald: ["Emerald", "#0ca678", "#1098ad"],
  ocean: ["Ocean", "#1c7ed6", "#0b7285"], rose: ["Rose", "#d6336c", "#9c36b5"], midnight: ["Midnight", "#212529", "#495057"]
};

/* brand glyphs on a 24x24 grid */
var SOCIALS = [
  { k: "linkedin", l: "LinkedIn", c: "#0a66c2", ph: "linkedin.com/in/you", p: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z" },
  { k: "x", l: "X (Twitter)", c: "#111827", ph: "@you", p: "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" },
  { k: "instagram", l: "Instagram", c: "linear-gradient(45deg,#f9a825,#e1306c 55%,#833ab4)", ph: "@you", p: "" },
  { k: "github", l: "GitHub", c: "#24292f", ph: "github.com/you", p: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" },
  { k: "youtube", l: "YouTube", c: "#ff0000", ph: "youtube.com/@you", p: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" },
  { k: "facebook", l: "Facebook", c: "#1877f2", ph: "facebook.com/you", p: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" },
  { k: "telegram", l: "Telegram", c: "#229ed9", ph: "@you", p: "M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" },
  { k: "portfolio", l: "Portfolio", c: "linear-gradient(135deg,#3b5bdb,#7048e8)", ph: "yourportfolio.com", p: "" },
  { k: "whatsapp", l: "WhatsApp", c: "#25d366", ph: "+91 98765 43210", p: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" }
];
var SOCIAL_BASE = { linkedin: "https://linkedin.com/in/", x: "https://x.com/", instagram: "https://instagram.com/", github: "https://github.com/", youtube: "https://youtube.com/@", facebook: "https://facebook.com/", telegram: "https://t.me/" };

/* ---------- helpers ---------- */
function $(s, r) { return (r || document).querySelector(s); }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function uid(p) { return (p || "id") + Math.random().toString(36).slice(2, 9); }
function slug(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function listItems(v) { return String(v || "").split(/[\n,;]/).map(function (x) { return x.trim(); }).filter(Boolean); }
function shade(hex, amt) {
  var m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim()); if (!m) return hex;
  var n = parseInt(m[1], 16), t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  return "#" + [n >> 16, (n >> 8) & 255, n & 255].map(function (v) { return Math.round((t - v) * p + v).toString(16).padStart(2, "0"); }).join("");
}
function gradient(theme) { var t = THEMES[theme] || THEMES.indigo; return "linear-gradient(135deg," + t[1] + "," + t[2] + ")"; }
var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtDate(v) { var m = /^(\d{4})(?:-(\d{2}))?$/.exec(v || ""); return !m ? "" : m[2] ? MONTHS[+m[2] - 1] + " " + m[1] : m[1]; }
function fmtRange(a, b) { var x = fmtDate(a), y = fmtDate(b); return !x && !y ? "" : (x || "?") + " – " + (y || "Present"); }
function byline(h, c) { h = (h || "").trim(); c = (c || "").trim(); if (!c) return h; if (!h) return c; return h.toLowerCase().indexOf(c.toLowerCase()) >= 0 ? h : h + " · " + c; }
function socialUrl(key, raw) {
  var v = String(raw || "").trim(); if (!v) return "";
  if (key === "whatsapp") { if (/^https?:\/\//i.test(v)) return v; var d = v.replace(/\D/g, ""); return d ? "https://wa.me/" + d : ""; }
  if (key === "portfolio") return /^https?:\/\//i.test(v) ? v : "https://" + v.replace(/^\/+/, "");
  if (/^https?:\/\//i.test(v)) return v;
  if (/^(www\.)?[a-z0-9-]+\.[a-z]{2,}\//i.test(v)) return "https://" + v.replace(/^www\./i, "");
  var h = v.replace(/^@/, "").replace(/[^\w.\-]/g, ""); return h && SOCIAL_BASE[key] ? SOCIAL_BASE[key] + h : "";
}
function socialIcon(k, size) {
  var s = SOCIALS.filter(function (x) { return x.k === k; })[0], col = "currentColor";
  if (k === "instagram") return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="' + col + '" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5.5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.3" cy="6.7" r="1.1" fill="' + col + '" stroke="none"/></svg>';
  if (k === "portfolio") return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="' + col + '" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.6 2.7 3.9 5.7 3.9 9s-1.3 6.3-3.9 9c-2.6-2.7-3.9-5.7-3.9-9S9.4 5.7 12 3z"/></svg>';
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="' + col + '" aria-hidden="true"><path d="' + (s ? s.p : "") + '"/></svg>';
}
function socialBadge(k, size) {
  var s = SOCIALS.filter(function (x) { return x.k === k; })[0];
  return '<span class="sbadge" style="width:' + size + 'px;height:' + size + 'px;background:' + (s ? s.c : "#3b5bdb") + '">' + socialIcon(k, Math.round(size * 0.5)) + "</span>";
}
/* booking providers (embed is not possible here, so this only names the provider) */
function bookingProvider(url) {
  try { var h = new URL(url).hostname.replace(/^www\./, ""); } catch (e) { return null; }
  var map = { "calendly.com": "Calendly", "cal.com": "Cal.com", "calendar.google.com": "Google Calendar", "outlook.office365.com": "Microsoft Bookings", "savvycal.com": "SavvyCal", "tidycal.com": "TidyCal", "youcanbook.me": "YouCanBookMe", "acuityscheduling.com": "Acuity", "hubspot.com": "HubSpot Meetings", "zoom.us": "Zoom Scheduler" };
  for (var d in map) if (h === d || h.slice(-d.length - 1) === "." + d) return map[d];
  return h;
}
function qrSvg(text, cell) {
  try { var q = qrcode(0, "M"); q.addData(String(text)); q.make(); return q.createSvgTag(cell || 4, 0); } catch (e) { return ""; }
}
