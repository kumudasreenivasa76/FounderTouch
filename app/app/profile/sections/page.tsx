import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { MODES, MODE_INFO, Mode } from "@/lib/modes";
import PageHead from "@/components/page-head";
import QuerySelect from "@/components/query-select";
import { addSection, delSection, saveModeSections } from "../actions";
export const dynamic = "force-dynamic";

export default async function Sections({ searchParams }: { searchParams: Promise<{ saved?: string; mode?: string }> }) {
  const sp = await searchParams;
  const { profile } = await requireOwner();
  const mode = ((MODES as readonly string[]).includes(sp.mode ?? "") ? sp.mode! : "ALL") as Mode;
  const [sections, cfg] = await Promise.all([
    db.section.findMany({ where: { profileId: profile.id }, orderBy: { order: "asc" } }),
    db.modeConfig.findFirst({ where: { profileId: profile.id, mode } }),
  ]);
  const shown = new Set<string>(JSON.parse(cfg?.sectionIds ?? "[]"));
  const info = MODE_INFO[mode];
  return (
    <>
      <PageHead title="Page sections" sub="Text blocks like About, Traction or Pricing. Pick a mode, then choose which sections it shows." saved={!!sp.saved} />

      <QuerySelect label="Choose a mode" current={mode} options={MODES.map((m) => ({ value: m, label: `${MODE_INFO[m].icon} ${MODE_INFO[m].label}` }))} />

      <form action={saveModeSections} className="card" style={{ marginTop: 12 }} key={mode}>
        <input type="hidden" name="mode" value={mode} />
        <h3>Shown on {info.icon} {info.label}</h3>
        {sections.length === 0 && <p className="muted" style={{ margin: 0 }}>No sections yet. Add one below.</p>}
        {sections.map((s) => (
          <label key={s.id} style={{ display: "block", margin: "6px 0" }}><input type="checkbox" name="sec" value={s.id} defaultChecked={shown.has(s.id)} />{s.title}</label>
        ))}
        {sections.length > 0 && <button style={{ marginTop: 8 }}>Save for {info.label}</button>}
      </form>

      <h2>All sections ({sections.length})</h2>
      {sections.map((s) => (
        <div className="card" key={s.id}>
          <b>{s.title}</b><div className="muted" style={{ whiteSpace: "pre-wrap" }}>{s.body}</div>
          <form action={delSection} style={{ marginTop: 8 }}><input type="hidden" name="id" value={s.id} /><button className="ghost sm">Delete</button></form>
        </div>
      ))}
      <form action={addSection} className="card">
        <h3>Add a section</h3>
        <input name="title" placeholder="Title (e.g. Traction)" required />
        <textarea name="body" rows={3} placeholder="Content" required />
        <button>Add section</button>
      </form>
    </>
  );
}
