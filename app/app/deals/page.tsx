import Link from "next/link";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import PageHead from "@/components/page-head";
import { DEAL_STAGES, dealStage } from "@/lib/deals";
import { addDeal, deleteDeal, moveDeal, saveDealNote } from "./actions";
export const dynamic = "force-dynamic";
export const metadata = { title: "Deal flow" };

/** Investor mode: pitches from the Investor page, moved through stages. */
export default async function Deals({ searchParams }: { searchParams: Promise<{ stage?: string; saved?: string; err?: string }> }) {
  const sp = await searchParams;
  const { profile } = await requireOwner();
  const all = await db.deal.findMany({ where: { profileId: profile.id }, orderBy: { updatedAt: "desc" } });
  const stage = DEAL_STAGES.some((s) => s.key === sp.stage) ? sp.stage! : "NEW";
  const shown = all.filter((d) => d.stage === stage);
  const count = (k: string) => all.filter((d) => d.stage === k).length;
  const next: Record<string, string[]> = { NEW: ["REVIEW", "PASSED"], REVIEW: ["TERM_SHEET", "PASSED"], TERM_SHEET: ["INVESTED", "PASSED"], INVESTED: [], PASSED: ["REVIEW"] };
  return (
    <div className="m-INVESTOR">
      <PageHead title="Deal flow" sub="Pitches sent from your Investor page land here as New." back="/app/more" saved={!!sp.saved} error={sp.err ? "Add the company name." : undefined} />
      <div className="tn-pipe">
        {DEAL_STAGES.filter((s) => s.key !== "PASSED").map((s) => (
          <Link key={s.key} href={`/app/deals?stage=${s.key}`} className={stage === s.key ? "on" : ""} aria-current={stage === s.key ? "page" : undefined}><b>{count(s.key)}</b><span>{s.label}</span></Link>
        ))}
      </div>
      <p className="muted" style={{ margin: "0 0 10px" }}><Link href={`/app/deals?stage=PASSED`}>Passed ({count("PASSED")})</Link> · <Link href={`/${profile.handle}?mode=INVESTOR&pane=pitch`}>Your pitch form</Link></p>
      {shown.length === 0 && <div className="card muted">{stage === "NEW" ? "No new pitches. Share your Investor page so founders can pitch you." : `Nothing in ${dealStage(stage).toLowerCase()}.`}</div>}
      {shown.map((d) => (
        <div key={d.id} className="card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <div style={{ minWidth: 0 }}><b style={{ fontSize: 16 }}>{d.company}</b><div className="muted">{[d.founder, d.round, d.amount].filter(Boolean).join(" · ")}</div></div>
            <span className="tn-badge">{dealStage(d.stage)}</span>
          </div>
          {d.note && <p style={{ margin: "8px 0", whiteSpace: "pre-wrap" }}>{d.note}</p>}
          <div className="row" style={{ margin: "8px 0", flexWrap: "wrap" }}>
            {d.deckUrl && <a className="btn ghost" href={d.deckUrl} target="_blank" rel="noopener noreferrer">Open deck</a>}
            {d.email && <a className="btn ghost" href={`mailto:${d.email}?subject=${encodeURIComponent(d.company)}`}>Email founder</a>}
          </div>
          <form action={moveDeal} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <input type="hidden" name="id" value={d.id} />
            {next[d.stage].map((k) => <button key={k} name="stage" value={k} className={k === "PASSED" ? "ghost sm" : "sm"}>{k === "PASSED" ? "Pass" : `Move to ${dealStage(k).toLowerCase()}`}</button>)}
          </form>
          <details style={{ marginTop: 8 }}>
            <summary className="muted" style={{ cursor: "pointer" }}>Private note</summary>
            <form action={saveDealNote}><input type="hidden" name="id" value={d.id} /><textarea name="note" rows={3} defaultValue={d.note} aria-label="Private note" /><button className="ghost sm">Save note</button></form>
            <form action={deleteDeal}><input type="hidden" name="id" value={d.id} /><button className="ghost sm" style={{ marginTop: 6 }}>Delete deal</button></form>
          </details>
        </div>
      ))}
      <details className="card">
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>Add a deal by hand</summary>
        <form action={addDeal} style={{ marginTop: 10 }}>
          <input name="company" placeholder="Company" required />
          <div className="row"><input name="founder" placeholder="Founder" /><input name="email" type="email" placeholder="Email" /></div>
          <div className="row"><input name="round" placeholder="Round" /><input name="amount" placeholder="Raising" /></div>
          <input name="deckUrl" type="url" placeholder="Deck link" />
          <textarea name="note" rows={3} placeholder="Notes" />
          <button>Add deal</button>
        </form>
      </details>
    </div>
  );
}
