import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { avatarBg } from "@/lib/avatar-color";
import { MODE_INFO, Mode } from "@/lib/modes";
import PageHead from "@/components/page-head";
import PhoneField from "@/components/phone-field";
import { toggleStar, saveDetails, addNote, setFollowUp, markFollowedUp, removeContact } from "../actions";
export const dynamic = "force-dynamic";
export const metadata = { title: "Contact" };

const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
const SOURCE: Record<string, string> = { qr: "Scanned your QR code", nfc: "Tapped your card", link: "Opened your link", event: "Met at an event", manual: "Added by hand", import: "Imported", team: "Teammate" };
const ICON: Record<string, string> = { created: "✦", visit: "", accepted: "", note: "", followup: "", done: "", event: "", edited: "" };
const when = (d: Date) => d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** One person: reach them, remember them, and decide when to follow up. */
export default async function ContactPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { profile } = await requireOwner();
  const c = await db.contact.findFirst({ where: { id, profileId: profile.id }, include: { activity: { orderBy: { createdAt: "desc" }, take: 30 } } });
  if (!c) notFound();
  const [files, pages, theirCard] = await Promise.all([
    db.deckRequest.findMany({ where: { profileId: profile.id, email: c.email }, include: { resource: true }, orderBy: { createdAt: "desc" } }),
    db.modeRequest.findMany({ where: { profileId: profile.id, email: c.email }, orderBy: { createdAt: "desc" } }),
    db.profile.findFirst({ where: { user: { email: c.email } }, select: { handle: true } }),
  ]);
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const link = await db.shareLink.findFirst({ where: { profileId: profile.id, mode: "ALL" } });
  const mine = link ? `${origin}/s/${link.token}` : `${origin}/${profile.handle}`;
  const first = c.name.split(" ")[0];
  const intro = `Hi ${first}, great meeting you${c.metAt ? " at " + c.metAt : ""}. Here is my card, so you have my details: ${mine}`;
  const due = c.followUpAt && c.followUpAt.getTime() <= Date.now() + 86400_000;
  const feed = c.activity.length ? c.activity : [];
  const here = `/app/contacts/${c.id}`;

  return (
    <>
      <PageHead title={c.name} back="/app/contacts" saved={!!sp.saved} />

      <div className="card" style={{ textAlign: "center" }}>
        <span className="av lg" style={{ background: avatarBg(c.email), margin: "0 auto 8px" }} aria-hidden>{initials(c.name)}</span>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{c.name}</div>
        <div className="muted">{[c.jobTitle, c.company].filter(Boolean).join(" at ") || c.email}</div>
        <div className="muted">{SOURCE[c.source] ?? c.source}{c.mode !== "ALL" && MODE_INFO[c.mode as Mode] ? ` · saw your ${MODE_INFO[c.mode as Mode].label} page` : ""}{c.interactions > 1 ? ` · ${c.interactions} visits` : ""}</div>
        <div className="row" style={{ marginTop: 12, flexWrap: "wrap" }}>
          <a className="btn" href={`mailto:${c.email}?subject=${encodeURIComponent("Good to meet you")}&body=${encodeURIComponent(intro)}`}>Email</a>
          {c.phone && <a className="btn ghost" href={`tel:${c.phone.replace(/\s+/g, "")}`}>Call</a>}
          {c.phone && <a className="btn ghost" href={`https://wa.me/${c.phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(intro)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
          <a className="btn ghost" href={c.linkedin || `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent((c.name + " " + c.company).trim())}`} target="_blank" rel="noopener noreferrer">{c.linkedin ? "LinkedIn" : "Find on LinkedIn"}</a>
        </div>
        <div className="row" style={{ marginTop: 8, flexWrap: "wrap" }}>
          <a className="btn ghost" href={`/app/contacts/${c.id}/vcard`}>Save to phone</a>
          {theirCard && <a className="btn ghost" href={`/${theirCard.handle}`} target="_blank" rel="noopener noreferrer">View their card</a>}
          <form action={toggleStar}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="back" value={here} /><button className="ghost" aria-pressed={c.starred}>{c.starred ? "★ Starred" : "☆ Star"}</button></form>
        </div>
      </div>

      <section aria-labelledby="fu" className="card" style={due ? { borderColor: "#f5c26b", background: "#fffaf0" } : undefined}>
        <h2 id="fu" style={{ fontSize: 15, margin: "0 0 6px" }}>Follow-up</h2>
        {c.followUpAt
          ? <p style={{ margin: "0 0 8px" }}><b>{c.followUpAt.toLocaleDateString("en-IN", { dateStyle: "full" })}</b>{c.followUpAt.getTime() < Date.now() - 86400_000 ? <span className="muted"> · overdue</span> : due ? <span className="muted"> · due today</span> : null}</p>
          : <p className="muted" style={{ margin: "0 0 8px" }}>No reminder set. Pick one so this person does not go cold.</p>}
        <div className="row" style={{ flexWrap: "wrap", marginBottom: 8 }}>
          {[[1, "Tomorrow"], [3, "In 3 days"], [7, "Next week"], [30, "In a month"]].map(([d, l]) => (
            <form key={d} action={setFollowUp}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="days" value={d} /><button className="ghost sm">{l}</button></form>
          ))}
        </div>
        <form action={setFollowUp} className="row" style={{ alignItems: "center" }}>
          <input type="hidden" name="id" value={c.id} />
          <input type="date" name="date" aria-label="Pick a follow-up date" defaultValue={c.followUpAt ? c.followUpAt.toISOString().slice(0, 10) : ""} />
          <button className="ghost" style={{ width: "auto" }}>Set date</button>
        </form>
        {c.followUpAt && (
          <div className="row" style={{ marginTop: 8 }}>
            <form action={markFollowedUp}><input type="hidden" name="id" value={c.id} /><button>✓ I followed up</button></form>
            <form action={setFollowUp}><input type="hidden" name="id" value={c.id} /><button className="ghost">Clear reminder</button></form>
          </div>
        )}
      </section>

      <section aria-labelledby="tl" className="card">
        <h2 id="tl" style={{ fontSize: 15, margin: "0 0 8px" }}>Activity</h2>
        <form action={addNote} className="row" style={{ marginBottom: 8 }}>
          <input type="hidden" name="id" value={c.id} />
          <input name="text" maxLength={300} placeholder="Add a note, e.g. wants a demo next month" aria-label="Add a note" />
          <button style={{ width: "auto" }}>Add</button>
        </form>
        {[...feed.map((a) => ({ k: a.id, icon: ICON[a.kind] ?? "•", text: a.text || a.kind, at: a.createdAt })), { k: "first", icon: "✦", text: SOURCE[c.source] ?? "Connected", at: c.createdAt }]
          .filter((x, i, arr) => !(x.k === "first" && arr.some((y) => y.icon === "✦" && y.k !== "first")))
          .sort((a, b) => b.at.getTime() - a.at.getTime()).map((x) => (
            <div key={x.k} style={{ display: "flex", gap: 10, padding: "6px 0", borderTop: "1px solid var(--line)" }}>
              <span aria-hidden style={{ width: 24, textAlign: "center" }}>{x.icon}</span>
              <span style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{x.text}</span>
              <span className="muted" style={{ whiteSpace: "nowrap" }}>{when(x.at)}</span>
            </div>
          ))}
      </section>

      {(files.length > 0 || pages.length > 0) && (
        <section aria-labelledby="sh" className="card">
          <h2 id="sh" style={{ fontSize: 15, margin: "0 0 6px" }}>Access you have given</h2>
          {files.map((r) => <div key={r.id} className="muted">{r.resource.title} · {r.status.toLowerCase()}</div>)}
          {pages.map((r) => <div key={r.id} className="muted">{MODE_INFO[r.mode as Mode]?.label ?? r.mode} page · {r.status.toLowerCase()}</div>)}
          <Link href="/app/contacts/inbox" className="muted">Manage in Inbox ›</Link>
        </section>
      )}

      <form action={saveDetails} className="card">
        <input type="hidden" name="id" value={c.id} />
        <h2 style={{ fontSize: 15, margin: "0 0 6px" }}>Details</h2>
        <label className="f" htmlFor="d-name">Name</label><input id="d-name" name="name" defaultValue={c.name} required />
        <div className="row">
          <div><label className="f" htmlFor="d-title">Job title</label><input id="d-title" name="jobTitle" defaultValue={c.jobTitle} /></div>
          <div><label className="f" htmlFor="d-co">Company</label><input id="d-co" name="company" defaultValue={c.company} /></div>
        </div>
        <label className="f" htmlFor="d-phone">Phone</label><PhoneField id="d-phone" name="phone" defaultValue={c.phone} />
        <label className="f" htmlFor="d-li">LinkedIn</label><input id="d-li" name="linkedin" defaultValue={c.linkedin} inputMode="url" placeholder="linkedin.com/in/…" />
        <label className="f" htmlFor="d-met">Where did you meet?</label><input id="d-met" name="metAt" defaultValue={c.metAt} placeholder="e.g. Expo 2026, stand 14" />
        <label className="f" htmlFor="d-tags">Tags (comma separated)</label><input id="d-tags" name="tags" defaultValue={c.tags.split(",").filter(Boolean).join(", ")} placeholder="investor, hot lead" />
        <label className="f" htmlFor="d-notes">Private notes</label><textarea id="d-notes" name="notes" rows={3} defaultValue={c.notes} />
        <p className="muted" style={{ margin: "0 0 8px" }}>Email: {c.email}</p>
        <button>Save details</button>
      </form>

      <form action={removeContact}><input type="hidden" name="id" value={c.id} /><button className="ghost" style={{ color: "#a61b1b", borderColor: "#a61b1b" }}>Remove this connection</button></form>
    </>
  );
}
