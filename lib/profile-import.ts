import { inflateRawSync } from "zlib";

/** What an import found, shown to the owner for review before anything is saved. */
export type DraftItem = { type: "EXPERIENCE" | "EDUCATION"; title: string; org: string; location: string; start: string; end: string; description: string };
export type Draft = { source: string; headline: string; bio: string; skills: string[]; items: DraftItem[] };
const emptyDraft = (source: string): Draft => ({ source, headline: "", bio: "", skills: [], items: [] });

/* ---------- reading files ---------- */

/** Reads the files out of a ZIP archive. Enough of the format for LinkedIn exports and Word documents. */
export function unzip(buf: Buffer): Map<string, Buffer> {
  const out = new Map<string, Buffer>();
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("not a zip");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let n = 0; n < count && p + 46 <= buf.length; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20), usize = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28), extraLen = buf.readUInt16LE(p + 30), commentLen = buf.readUInt16LE(p + 32), local = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;
    if (name.endsWith("/") || usize > 20 * 1024 * 1024) continue; // folders, and anything unreasonably large
    if (local + 30 > buf.length || buf.readUInt32LE(local) !== 0x04034b50) continue;
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(start, start + csize);
    try { out.set(name, method === 0 ? Buffer.from(raw) : method === 8 ? inflateRawSync(raw) : Buffer.alloc(0)); } catch { /* damaged entry: skip it */ }
  }
  return out;
}

/** A small CSV reader that copes with quotes, commas and line breaks inside quoted cells. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

/** Rows as objects keyed by header. LinkedIn sometimes puts a note above the header, so the header row is found by a known column. */
function table(text: string, mustHave: string): Record<string, string>[] {
  const rows = parseCsv(text);
  const h = rows.findIndex((r) => r.some((c) => c.trim().toLowerCase() === mustHave.toLowerCase()));
  if (h < 0) return [];
  const head = rows[h].map((c) => c.trim().toLowerCase());
  return rows.slice(h + 1).map((r) => Object.fromEntries(head.map((k, i) => [k, (r[i] ?? "").trim()])));
}

const decodeXml = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&amp;/g, "&");

/** The text of a Word (.docx) file, one paragraph per line. */
export function docxText(buf: Buffer): string {
  const xml = unzip(buf).get("word/document.xml")?.toString("utf8");
  if (!xml) throw new Error("not a docx");
  return decodeXml(xml.replace(/<w:tab\/>/g, "\t").replace(/<w:br[^>]*\/>/g, "\n").replace(/<\/w:p>/g, "\n").replace(/<[^>]+>/g, ""));
}

/** The text of a PDF. Needs the optional "unpdf" package; returns null when it is not installed. */
export async function pdfText(buf: Buffer): Promise<string | null> {
  try {
    const name = "unpdf";
    const m = await import(/* webpackIgnore: true */ name);
    const doc = await m.getDocumentProxy(new Uint8Array(buf));
    const { text } = await m.extractText(doc, { mergePages: true });
    return Array.isArray(text) ? text.join("\n") : String(text);
  } catch {
    return null;
  }
}

/* ---------- dates ---------- */

const MON = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
/** "Jan 2020", "January 2020", "03/2019", "2019-03", "2019" -> "2020-01" / "2019". "Present" and friends -> "". */
export function toDate(v: string): string {
  const s = v.trim().toLowerCase();
  if (!s || /present|current|now|till|ongoing|today/.test(s)) return "";
  let m = /([a-z]{3})[a-z]*\.?,?\s+(\d{4})/.exec(s);
  if (m && MON.includes(m[1])) return `${m[2]}-${String(MON.indexOf(m[1]) + 1).padStart(2, "0")}`;
  m = /\b(\d{1,2})[/.-](\d{4})\b/.exec(s);
  if (m && Number(m[1]) >= 1 && Number(m[1]) <= 12) return `${m[2]}-${m[1].padStart(2, "0")}`;
  m = /\b(\d{4})-(\d{2})\b/.exec(s);
  if (m) return `${m[1]}-${m[2]}`;
  m = /\b(19|20)\d{2}\b/.exec(s);
  return m ? m[0] : "";
}
const yearOf = (d: string) => d.slice(0, 4);

/* ---------- LinkedIn data export ---------- */

/**
 * Builds a draft from LinkedIn's "Get a copy of your data" export: the ZIP itself, or the CSV files inside it
 * (Profile.csv, Positions.csv, Education.csv, Skills.csv).
 */
export function fromLinkedIn(files: { name: string; data: Buffer }[]): Draft {
  const d = emptyDraft("LinkedIn");
  const csv = new Map<string, string>();
  for (const f of files) {
    if (/\.zip$/i.test(f.name)) {
      for (const [name, data] of unzip(f.data)) if (/\.csv$/i.test(name)) csv.set(name.split("/").pop()!.toLowerCase(), data.toString("utf8"));
    } else if (/\.csv$/i.test(f.name)) csv.set(f.name.split(/[\\/]/).pop()!.toLowerCase(), f.data.toString("utf8"));
  }
  const get = (n: string) => csv.get(n) ?? "";

  const prof = table(get("profile.csv"), "headline")[0];
  if (prof) { d.headline = (prof["headline"] ?? "").slice(0, 120); d.bio = (prof["summary"] ?? "").slice(0, 600); }
  for (const r of table(get("positions.csv"), "company name")) {
    if (!r["title"] && !r["company name"]) continue;
    d.items.push({ type: "EXPERIENCE", title: r["title"] ?? "", org: r["company name"] ?? "", location: r["location"] ?? "", start: toDate(r["started on"] ?? ""), end: toDate(r["finished on"] ?? ""), description: (r["description"] ?? "").slice(0, 1200) });
  }
  for (const r of table(get("education.csv"), "school name")) {
    if (!r["school name"]) continue;
    d.items.push({ type: "EDUCATION", title: r["degree name"] || "Studies", org: r["school name"], location: "", start: yearOf(toDate(r["start date"] ?? "")), end: yearOf(toDate(r["end date"] ?? "")), description: [r["notes"], r["activities"]].filter(Boolean).join("\n").slice(0, 1200) });
  }
  d.skills = table(get("skills.csv"), "name").map((r) => r["name"]).filter(Boolean).slice(0, 40);
  return d;
}

/* ---------- resume text ---------- */

const HEAD: [RegExp, string][] = [
  [/^(work |professional |relevant )?(experience|employment( history)?)$|^(work|career|employment) history$/i, "EXP"],
  [/^(education|academic (background|qualifications?)|qualifications?|education (and|&) training)$/i, "EDU"],
  [/^((technical |key |core |professional )?skills|core competencies|areas of expertise|expertise|technologies|tech stack)$/i, "SKILLS"],
  [/^(summary|profile|about( me)?|objective|professional summary|career (summary|objective)|personal statement)$/i, "SUMMARY"],
  [/^(projects?|certifications?|certificates?|awards?|achievements?|publications?|languages?|interests?|hobbies|references?|volunteer(ing)?( experience)?|courses?|training|activities)$/i, "OTHER"],
];
const D = "(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?,?\\s+\\d{4}|\\d{1,2}[/.]\\d{4}|(?:19|20)\\d{2})";
const RANGE = new RegExp(`(${D})\\s*(?:-|–|—|to|until)\\s*(${D}|present|current|now|till date|ongoing|today)`, "i");
const SCHOOL = /universit|college|institute|school|academy|polytechnic|\biit\b|\bnit\b|\biim\b|vidyalaya/i;
const BULLET = /^[•\-*–▪◦●○■·>]\s*/;
const isContact = (l: string) => /@|https?:|www\.|linkedin\.com|github\.com|\+?\d[\d\s().-]{7,}\d/.test(l);
const clean = (s: string) => s.replace(/\s+/g, " ").replace(/^[\s,|–—-]+|[\s,|–—-]+$/g, "").trim();
const short = (l: string) => l.length <= 80 && !/[.;:]$/.test(l) && !BULLET.test(l);

/** Splits a header such as "Product Designer, Acme" or "Acme | Product Designer" into its two halves. */
function splitHeader(lines: string[]): [string, string] {
  const parts = lines.flatMap((l) => l.split(/\s+\|\s+|\s+@\s+|\s+at\s+|\s+[–—]\s+|\s{3,}|\t+|,\s+(?=[A-Z])/).map(clean)).filter(Boolean);
  return [parts[0] ?? "", parts[1] ?? ""];
}

/** Finds the dated entries (jobs or courses) in one section of a resume. */
function entries(lines: string[], type: DraftItem["type"]): DraftItem[] {
  const at = lines.map((l, i) => (RANGE.test(l) ? i : -1)).filter((i) => i >= 0);
  const items: DraftItem[] = [];
  let floor = 0; // lines before this belong to earlier entries
  at.forEach((d, k) => {
    const m = RANGE.exec(lines[d])!;
    const rest = clean(lines[d].replace(RANGE, " "));
    const head: string[] = [];
    for (let i = d - 1; i >= floor && head.length < 2 && short(lines[i]); i--) head.unshift(lines[i]);
    if (rest) head.push(rest);
    let body = d + 1;
    if (head.length === 0) while (body < lines.length && head.length < 2 && short(lines[body]) && !RANGE.test(lines[body])) head.push(lines[body++]); // dates came first
    const nextStart = k + 1 < at.length ? at[k + 1] : lines.length;
    // Leave the next entry its header: up to two short lines just above its dates.
    let end = nextStart;
    if (k + 1 < at.length) for (let i = nextStart - 1, n = 0; i >= body && n < 2 && short(lines[i]); i--, n++) end = i;
    const description = lines.slice(body, end).map((l) => l.replace(BULLET, "").trim()).filter(Boolean).join("\n").slice(0, 1200);
    let [title, org] = splitHeader(head);
    if (type === "EDUCATION" && SCHOOL.test(title) && !SCHOOL.test(org)) [title, org] = [org, title];
    const start = toDate(m[1]), finish = toDate(m[2]);
    if (title || org) items.push({ type, title: title.slice(0, 120), org: org.slice(0, 120), location: "", start: type === "EDUCATION" ? yearOf(start) : start, end: type === "EDUCATION" ? yearOf(finish) : finish, description });
    floor = end;
  });
  // Education is often listed with no dates at all: pair each school with the line beside it.
  if (type === "EDUCATION" && items.length === 0) {
    lines.forEach((l, i) => {
      if (!SCHOOL.test(l) || !short(l)) return;
      const near = [lines[i - 1], lines[i + 1]].find((x) => x && short(x) && !SCHOOL.test(x)) ?? "";
      const y = /\b(19|20)\d{2}\b/.exec(`${l} ${near}`);
      items.push({ type, title: clean(near.replace(/\b(19|20)\d{2}\b/g, "")) || "Studies", org: clean(l.replace(/\b(19|20)\d{2}\b/g, "")), location: "", start: "", end: y ? y[0] : "", description: "" });
    });
  }
  return items;
}

/** Builds a draft from the plain text of a resume. It is a best guess, which is why the owner reviews it before saving. */
export function fromResume(text: string): Draft {
  const d = emptyDraft("resume");
  const lines = text.replace(/\r/g, "").split("\n").map((l) => l.replace(/ /g, " ").trim()).filter(Boolean);
  const sections: Record<string, string[]> = { TOP: [] };
  let cur = "TOP";
  for (const l of lines) {
    const bare = l.replace(/[:\s]+$/, "");
    const hit = bare.length <= 40 ? HEAD.find(([re]) => re.test(bare)) : undefined;
    if (hit) { cur = hit[1]; sections[cur] ??= []; continue; }
    sections[cur].push(l);
  }
  // The line under the name is usually a job title, unless it is contact details.
  const top = sections.TOP.filter((l) => !isContact(l));
  if (top[1] && top[1].length <= 80 && !RANGE.test(top[1])) d.headline = clean(top[1]);
  const summary = sections.SUMMARY ?? (top.length > 2 ? top.slice(2).filter((l) => l.length > 60) : []);
  d.bio = summary.join(" ").replace(/\s+/g, " ").slice(0, 600);
  d.skills = [...new Set((sections.SKILLS ?? []).flatMap((l) => l.replace(BULLET, "").replace(/^[^:]{2,30}:\s*/, "").split(/[,;|•·●]|\s{3,}|\t/)).map(clean).filter((x) => x.length >= 2 && x.length <= 40))].slice(0, 40);
  d.items = [...entries(sections.EXP ?? [], "EXPERIENCE"), ...entries(sections.EDU ?? [], "EDUCATION")];
  return d;
}
