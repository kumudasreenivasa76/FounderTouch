import Link from "next/link";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { MODES, MODE_INFO, Mode, kindLabel, kindsOf, parseFields } from "@/lib/modes";
import { buildNeedData, modeNeeds } from "@/lib/mode-needs";
import { tagList } from "@/lib/tags";
import Swiper from "@/components/swiper";
import { addResource, delResource, saveKitText, setResourceModes } from "../actions";
export const dynamic = "force-dynamic";

const ERR: Record<string, string> = {
  url: "Links must start with http:// or https://",
  size: "That file is over 25 MB. Upload it to Google Drive and paste the link instead.",
  empty: "Paste a link or choose a file.",
};
const HINT: Record<string, string> = {
  DECK: "A Google Drive or Slides link, or a PDF, shows right on your page.",
  DEMO: "A YouTube, Vimeo, Loom or Drive link, or an MP4, plays on your page.",
  DOC: "A catalog, brochure or one-pager. Paste a link or upload a file.",
  SUPPORT: "Cap table, certificates, case studies. Tags let visitors filter them.",
};
// Resume and Portfolio live under "Hire me", so they are not repeated here.
const KIT_KINDS = ["DECK", "DEMO", "DOC", "SUPPORT"] as const;
const PAGES = MODES.filter((m) => m !== "ALL" && m !== "HIRE");

export default async function Kits({ searchParams }: { searchParams: Promise<{ err?: string; saved?: string; kind?: string; mode?: string }> }) {
  const sp = await searchParams;
  const { profile } = await requireOwner();
  const [resources, cfgs, team, projects, events] = await Promise.all([
    db.resource.findMany({ where: { profileId: profile.id }, orderBy: { createdAt: "asc" } }),
    db.modeConfig.findMany({ where: { profileId: profile.id } }),
    db.teamMember.count({ where: { profileId: profile.id } }),
    db.project.count({ where: { profileId: profile.id, eventId: null } }),
    db.event.count({ where: { profileId: profile.id } }),
  ]);
  const start = Math.max(0, PAGES.findIndex((m) => m === sp.mode));

  return (
    <>
      <div className="shell-head" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/app/profile" className="muted">← Back</Link>
        <b style={{ fontSize: 17 }}>Kits</b>
        <span className="muted" style={{ marginLeft: "auto" }}>Swipe to switch</span>
      </div>

      <Swiper labels={PAGES.map((m) => `${MODE_INFO[m].icon} ${MODE_INFO[m].label}`)} initial={start}>
        {PAGES.map((m) => {
          const info = MODE_INFO[m];
          const cfg = cfgs.find((c) => c.mode === m);
          const values = parseFields(cfg?.fields ?? "{}");
          const text = cfg?.kitText || (m === "FOUNDER" ? profile.product : "");
          const needs = modeNeeds(m, buildNeedData({ profile, cfg: cfg ?? { kitText: "", fields: "{}", bookingUrl: "" }, mode: m, resources, team, projects, events }));
          const todo = needs.filter((n) => !n.ok);
          const mine = (k: string) => resources.filter((r) => r.kind === k && r.modes.split(",").includes(m));
          const kinds = KIT_KINDS.filter((k) => kindsOf(m).includes(k));
          const active = sp.mode === m;
          const kind = active && sp.kind && (kinds as readonly string[]).includes(sp.kind) ? sp.kind : kinds[0];
          return (
            <div key={m}>
              <h2 style={{ marginBottom: 2 }}>{info.icon} {info.kit}</h2>
              <p className="muted" style={{ marginTop: 0 }}>{info.blurb}. Fill in only what applies to you.</p>
              {active && sp.saved && <div className="ok">Saved ✓</div>}
              {active && sp.err && <div className="err">{ERR[sp.err] ?? "Something went wrong."}</div>}

              <div className="card" style={{ borderColor: todo.length ? "#ffd8a8" : "#b2f2bb", background: todo.length ? "#fff9f0" : "#f3fcf5" }}>
                <b>{todo.length ? `Still needed for the ${info.label} page` : `${info.label} page is ready ✓`}</b>
                {needs.map((n) => (
                  <Link key={n.label} href={n.href} style={{ display: "flex", gap: 8, padding: "4px 0", color: n.ok ? "#6b7587" : "#1c2330" }}>
                    <span>{n.ok ? "✅" : "➕"}</span><span style={{ flex: 1, textDecoration: n.ok ? "line-through" : "none" }}>{n.label}</span>
                  </Link>
                ))}
              </div>

              <form action={saveKitText} className="card">
                <input type="hidden" name="kmode" value={m} />
                <h3>{info.about}</h3>
                <textarea name="kitText" rows={3} defaultValue={text} placeholder={info.aboutHint} />
                {info.fields.map((f) => (
                  <div key={f.key}>
                    <label className="f">{f.label}</label>
                    {(f.type === "textarea" || f.type === "list") && <textarea name={"f_" + f.key} rows={f.type === "list" ? 2 : 3} defaultValue={values[f.key] ?? ""} placeholder={f.type === "list" ? `${f.hint ?? ""} (one per line or comma separated)`.trim() : f.hint} />}
                    {f.type === "text" && <input name={"f_" + f.key} defaultValue={values[f.key] ?? ""} placeholder={f.hint} />}
                    {f.type === "url" && <input name={"f_" + f.key} defaultValue={values[f.key] ?? ""} placeholder={f.hint ?? "https://"} inputMode="url" autoCapitalize="none" />}
                    {f.type === "select" && (
                      <select name={"f_" + f.key} defaultValue={values[f.key] ?? ""}>
                        <option value="">Not set</option>
                        {f.options!.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    )}
                  </div>
                ))}
                <button>Save {info.label.toLowerCase()} details</button>
              </form>

              {m === "RECRUITER" && (
                <div className="card"><b>💼 Open roles</b>
                  <p className="muted" style={{ margin: "4px 0 8px" }}>Post the roles you are hiring for. Candidates apply on your page and show up in Contacts.</p>
                  <Link className="btn" href="/app/profile/jobs">Manage open roles</Link>
                </div>
              )}

              {m === "HACKATHON" && (
                <div className="card"><b>🏆 Projects &amp; events</b>
                  <div className="row" style={{ marginTop: 8 }}><Link className="btn ghost" href="/app/profile/sections?tab=projects">My projects</Link><Link className="btn ghost" href="/app/events">Events</Link></div>
                </div>
              )}

              {kinds.map((k) => (
                <div key={k}>
                  <h3 style={{ margin: "14px 0 6px" }}>{kindLabel(m, k)} ({mine(k).length})</h3>
                  {mine(k).length === 0 && <div className="card muted">Nothing here yet.</div>}
                  {mine(k).map((r) => (
                    <div className="card" key={r.id}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <b>{r.title}</b>{r.gated && <span className="pill" style={{ marginLeft: 6 }}>🔒 needs approval</span>}
                          {tagList(r.tags).length > 0 && <div>{tagList(r.tags).map((t) => <span key={t} className="pill">#{t}</span>)}</div>}
                          <div className="muted">{r.filePath ? "Uploaded file" : new URL(r.url).hostname}</div>
                        </div>
                        <form action={delResource}><input type="hidden" name="id" value={r.id} /><button className="ghost sm">Remove</button></form>
                      </div>
                      <details style={{ marginTop: 8 }}>
                        <summary className="muted">Also on: {r.modes.split(",").filter((x) => x && x !== m).map((x) => MODE_INFO[x as Mode]?.label).filter(Boolean).join(", ") || "only this page"} · <span style={{ color: "#3b5bdb" }}>change</span></summary>
                        <form action={setResourceModes}>
                          <input type="hidden" name="id" value={r.id} /><input type="hidden" name="kmode" value={m} />
                          <div className="chips">
                            {PAGES.filter((x) => kindsOf(x).includes(r.kind as never)).map((x) => (
                              <label key={x} className="pill" style={{ cursor: "pointer" }}><input type="checkbox" name="modes" value={x} defaultChecked={r.modes.split(",").includes(x)} />{MODE_INFO[x].icon} {MODE_INFO[x].label}</label>
                            ))}
                          </div>
                          <button className="ghost sm">Save</button>
                        </form>
                      </details>
                    </div>
                  ))}
                </div>
              ))}

              <form action={addResource} className="card" key={m + kind}>
                <input type="hidden" name="kmode" value={m} />
                <h3>Add to the {info.kit}</h3>
                <select name="kind" defaultValue={kind}>{kinds.map((k) => <option key={k} value={k}>{kindLabel(m, k)}</option>)}</select>
                <p className="muted" style={{ margin: "0 0 8px" }}>{HINT[kind]}</p>
                <input name="title" placeholder="Title (optional)" />
                <input name="url" placeholder="Paste a link" inputMode="url" autoCapitalize="none" />
                <label className="f">Or upload a file (up to 25 MB)</label>
                <input name="file" type="file" accept=".ppt,.pptx,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.mp4,.mov,.webm,.key" />
                <input name="tags" placeholder="Tags (optional), e.g. legal, financials" />
                <label className="f">Also show on</label>
                <div className="chips">
                  {PAGES.filter((x) => kinds.some((k) => kindsOf(x).includes(k))).map((x) => (
                    <label key={x} className="pill" style={{ cursor: "pointer" }}><input type="checkbox" name="modes" value={x} defaultChecked={x === m} />{MODE_INFO[x].icon} {MODE_INFO[x].label}</label>
                  ))}
                </div>
                <label style={{ display: "block", margin: "4px 0 10px" }}><input type="checkbox" name="gated" />🔒 Visitors need my approval to open it</label>
                <button>Add</button>
              </form>
            </div>
          );
        })}
      </Swiper>
    </>
  );
}
