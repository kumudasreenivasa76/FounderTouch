"use client";
import { useRef, useState, useTransition } from "react";
import type { Draft, DraftItem } from "@/lib/profile-import";

type Row = DraftItem & { on: boolean };
type Props = { apply: (json: string) => Promise<void>; hasHeadline: boolean; hasBio: boolean };

const fmt = (s: string) => s || "–";

/** Import from LinkedIn or a resume: upload, review what was found, then add the parts you want. */
export default function ProfileImport({ apply, hasHeadline, hasBio }: Props) {
  const [tab, setTab] = useState<"linkedin" | "resume">("linkedin");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [skills, setSkills] = useState<{ name: string; on: boolean }[]>([]);
  const [useHeadline, setUseHeadline] = useState(false);
  const [useBio, setUseBio] = useState(false);
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [saving, start] = useTransition();
  const form = useRef<HTMLFormElement>(null);

  const read = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const fd = new FormData(e.currentTarget);
      fd.set("kind", tab);
      const res = await fetch("/app/profile/import/read", { method: "POST", body: fd });
      const j = await res.json();
      if (!j.ok) { setErr(j.error || "That could not be read."); return; }
      const d: Draft = j.draft;
      setDraft(d);
      setRows(d.items.map((it) => ({ ...it, on: true })));
      setSkills(d.skills.map((name) => ({ name, on: true })));
      setHeadline(d.headline); setBio(d.bio);
      // Only offer to overwrite a headline or bio that is empty by default.
      setUseHeadline(!!d.headline && !hasHeadline); setUseBio(!!d.bio && !hasBio);
    } catch { setErr("The upload did not go through. Check your connection and try again."); }
    finally { setBusy(false); }
  };
  const edit = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, n) => (n === i ? { ...x, ...patch } : x)));
  const chosen = rows.filter((r) => r.on && r.title.trim() && r.org.trim());
  const save = () => start(async () => {
    await apply(JSON.stringify({
      headline: useHeadline ? headline : "", bio: useBio ? bio : "",
      skills: skills.filter((s) => s.on).map((s) => s.name),
      items: chosen.map(({ on: _on, ...it }) => it),
    }));
  });

  if (draft) {
    const group = (type: Row["type"], label: string) => {
      const list = rows.map((r, i) => ({ r, i })).filter((x) => x.r.type === type);
      if (!list.length) return null;
      return (
        <>
          <h3 className="kit-sec">{label}<span>{list.filter((x) => x.r.on).length}/{list.length}</span></h3>
          {list.map(({ r, i }) => (
            <div key={i} className={"doc im-row" + (r.on ? "" : " off")}>
              <label className="im-pick">
                <input type="checkbox" checked={r.on} onChange={(e) => edit(i, { on: e.target.checked })} aria-label={`Add ${r.title || "this entry"}`} />
                <span>{type === "EDUCATION" ? "Course" : "Job"} {list.findIndex((x) => x.i === i) + 1}<em>{fmt(r.start)} to {r.end || "now"}</em></span>
                <button type="button" className="im-swap" onClick={() => edit(i, { title: r.org, org: r.title })}>Swap the two</button>
              </label>
              <label className="doc-opt-t" htmlFor={`im-t-${i}`}>{type === "EDUCATION" ? "Degree or course" : "Job title"}</label>
              <input id={`im-t-${i}`} className="im-in" value={r.title} maxLength={120} onChange={(e) => edit(i, { title: e.target.value })} />
              <label className="doc-opt-t" htmlFor={`im-o-${i}`}>{type === "EDUCATION" ? "School" : "Company"}</label>
              <input id={`im-o-${i}`} className="im-in" value={r.org} maxLength={120} onChange={(e) => edit(i, { org: e.target.value })} />
              {r.description && <p className="im-desc">{r.description.length > 220 ? r.description.slice(0, 220) + "…" : r.description}</p>}
            </div>
          ))}
        </>
      );
    };
    return (
      <div className="im">
        <div className="ok">Found {rows.length} {rows.length === 1 ? "entry" : "entries"} and {skills.length} {skills.length === 1 ? "skill" : "skills"} in your {draft.source}. Nothing is saved until you press Add.</div>

        {(headline || bio) && (
          <>
            <h3 className="kit-sec">About you</h3>
            {headline && (
              <div className={"doc im-row" + (useHeadline ? "" : " off")}>
                <label className="im-pick"><input type="checkbox" checked={useHeadline} onChange={(e) => setUseHeadline(e.target.checked)} /><span>Headline{hasHeadline && <em>replaces your current one</em>}</span></label>
                <input className="im-in" value={headline} maxLength={120} onChange={(e) => setHeadline(e.target.value)} aria-label="Headline" />
              </div>
            )}
            {bio && (
              <div className={"doc im-row" + (useBio ? "" : " off")}>
                <label className="im-pick"><input type="checkbox" checked={useBio} onChange={(e) => setUseBio(e.target.checked)} /><span>Bio{hasBio && <em>replaces your current one</em>}</span></label>
                <textarea className="im-in" rows={4} value={bio} maxLength={600} onChange={(e) => setBio(e.target.value)} aria-label="Bio" />
              </div>
            )}
          </>
        )}

        {group("EXPERIENCE", "Experience")}
        {group("EDUCATION", "Education")}

        {skills.length > 0 && (
          <>
            <h3 className="kit-sec">Skills<span>{skills.filter((s) => s.on).length}/{skills.length}</span></h3>
            <div className="im-skills">
              {skills.map((s, i) => (
                <button key={s.name + i} type="button" aria-pressed={s.on} className={s.on ? "on" : ""} onClick={() => setSkills((k) => k.map((x, n) => (n === i ? { ...x, on: !x.on } : x)))}>{s.name}</button>
              ))}
            </div>
            <p className="mode-add-note">Tap a skill to leave it out. Skills you already have are not repeated.</p>
          </>
        )}

        <div className="im-bar">
          <button type="button" className="im-back" onClick={() => { setDraft(null); setErr(""); }} disabled={saving}>Start again</button>
          <button type="button" className="im-go" onClick={save} disabled={saving || (!chosen.length && !skills.some((s) => s.on) && !useHeadline && !useBio)}>
            {saving ? "Adding" : `Add ${chosen.length} ${chosen.length === 1 ? "entry" : "entries"} to my profile`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="im">
      <nav className="seg" aria-label="Import from">
        <a href="#linkedin" aria-current={tab === "linkedin" ? "page" : undefined} onClick={(e) => { e.preventDefault(); setTab("linkedin"); setErr(""); }}>LinkedIn</a>
        <a href="#resume" aria-current={tab === "resume" ? "page" : undefined} onClick={(e) => { e.preventDefault(); setTab("resume"); setErr(""); }}>Resume</a>
      </nav>
      {err && <div className="err" role="alert">{err}</div>}

      <form ref={form} onSubmit={read} className="card kit-form kit-lux im-form">
        {tab === "linkedin" ? (
          <>
            <ol className="im-steps">
              <li>On LinkedIn open <b>Settings</b>, then <b>Data privacy</b>, then <b>Get a copy of your data</b>.</li>
              <li>Tick <b>Profile</b>, <b>Positions</b>, <b>Education</b> and <b>Skills</b> (or the full archive) and request it.</li>
              <li>LinkedIn emails you a ZIP file, usually within minutes. Upload it here.</li>
            </ol>
            <label className="f" htmlFor="im-li">LinkedIn ZIP, or its CSV files</label>
            <input id="im-li" name="file" type="file" accept=".zip,.csv" multiple required />
            <p className="kit-note">LinkedIn does not let other apps read your profile directly, so the export is the reliable way in.</p>
          </>
        ) : (
          <>
            <label className="f" htmlFor="im-cv" style={{ marginTop: 14 }}>Resume file</label>
            <input id="im-cv" name="file" type="file" accept=".docx,.pdf,.txt,.md,.rtf" />
            <div className="kit-or"><span>or</span></div>
            <label className="f" htmlFor="im-text">Paste the text</label>
            <textarea id="im-text" name="text" rows={7} placeholder="Open your resume, select everything, copy, and paste it here." />
            <p className="kit-note">Works best when the resume has headings such as Experience, Education and Skills.</p>
          </>
        )}
        <button disabled={busy}>{busy ? "Reading" : "Read it"}</button>
      </form>
      <p className="mode-add-note">You review everything before it is added, and nothing you already have is removed.</p>
    </div>
  );
}
