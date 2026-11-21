import Link from "next/link";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import PageHead from "@/components/page-head";
import Icon from "@/components/icon";
import { dealStage } from "@/lib/deals";
export const dynamic = "force-dynamic";
export const metadata = { title: "Opportunities" };

type Item = { key: string; kind: string; mode: string; title: string; sub: string; href: string; at: Date };
const FILTERS = [{ k: "all", label: "All" }, { k: "deals", label: "Deals" }, { k: "leads", label: "Leads" }, { k: "applicants", label: "Applicants" }, { k: "invites", label: "Job invites" }];

/** Everything that could turn into business: pitches, buyer leads, applicants and roles you were invited to. */
export default async function Opportunities({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const sp = await searchParams;
  const f = FILTERS.some((x) => x.k === sp.f) ? sp.f! : "all";
  const { profile } = await requireOwner();
  const [deals, leads, applicants, invites] = await Promise.all([
    db.deal.findMany({ where: { profileId: profile.id, stage: { in: ["NEW", "REVIEW", "TERM_SHEET"] } }, orderBy: { updatedAt: "desc" }, take: 50 }),
    db.contact.findMany({ where: { profileId: profile.id, mode: "SERVICES", tags: { contains: "lead" } }, orderBy: { lastInteractionAt: "desc" }, take: 50 }),
    db.application.findMany({ where: { profileId: profile.id, status: { in: ["NEW", "SHORTLISTED", "INTERVIEW"] } }, include: { job: { select: { title: true } } }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.invite.findMany({ where: { candidateProfileId: profile.id }, include: { job: { include: { profile: { select: { handle: true, name: true, company: true } } } } }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  const items: Item[] = [
    ...deals.map((d) => ({ key: "d" + d.id, kind: "deals", mode: "INVESTOR", title: d.company, sub: `${dealStage(d.stage)}${d.amount ? ` · ${d.amount}` : ""}${d.founder ? ` · ${d.founder}` : ""}`, href: `/app/deals?stage=${d.stage}`, at: d.updatedAt })),
    ...leads.map((c) => ({ key: "l" + c.id, kind: "leads", mode: "SERVICES", title: c.name, sub: c.message || "Asked for a quote", href: `/app/contacts/${c.id}`, at: c.lastInteractionAt })),
    ...applicants.map((a) => ({ key: "a" + a.id, kind: "applicants", mode: "RECRUITER", title: a.name, sub: `Applied for ${a.job.title}`, href: `/app/hire/candidate/${a.id}`, at: a.createdAt })),
    ...invites.map((i) => ({ key: "i" + i.id, kind: "invites", mode: "RECRUITER", title: i.job.title, sub: `${i.job.profile.company || i.job.profile.name} invited you to apply`, href: `/${i.job.profile.handle}/apply/${i.jobId}`, at: i.createdAt })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());
  const shown = f === "all" ? items : items.filter((x) => x.kind === f);
  const n = (k: string) => items.filter((x) => x.kind === k).length;
  const LABEL: Record<string, string> = { deals: "Deal", leads: "Lead", applicants: "Applicant", invites: "Job invite" };
  return (
    <>
      <PageHead title="Opportunities" sub="Pitches, buyer leads, applicants and roles you were invited to, in one place." back="/app" />
      <div className="tn-stats">
        <Link href="/app/opportunities?f=deals" className="m-INVESTOR"><b>{n("deals")}</b><span>Deals</span></Link>
        <Link href="/app/opportunities?f=leads" className="m-SERVICES"><b>{n("leads")}</b><span>Leads</span></Link>
        <Link href="/app/opportunities?f=applicants" className="m-RECRUITER"><b>{n("applicants")}</b><span>Applicants</span></Link>
        <Link href="/app/opportunities?f=invites" className="m-RECRUITER"><b>{n("invites")}</b><span>Invites</span></Link>
      </div>
      <nav className="tn-switch m-ALL" aria-label="Filter">
        {FILTERS.map((x) => <a key={x.k} href={`/app/opportunities?f=${x.k}`} aria-current={f === x.k ? "page" : undefined}>{x.label}</a>)}
      </nav>
      {shown.length === 0 && (
        <div className="card muted">
          {f === "deals" ? <>No open deals. <Link href="/app/deals">Open deal flow</Link> or share your Investor page.</> :
           f === "leads" ? <>No leads yet. <Link href="/app/catalog">Add products</Link> so buyers can ask about them.</> :
           f === "applicants" ? <>No active applicants. <Link href="/app/hire/new">Post a role</Link>.</> :
           f === "invites" ? "No job invites yet. Turn on Open to work in Experience & skills so recruiters can find you." :
           "Nothing here yet. Pitches, buyer questions, applicants and job invites will show up as they arrive."}
        </div>
      )}
      {shown.map((x) => (
        <Link key={x.key} href={x.href} className={`menu-row m-${x.mode}`}>
          <span className="menu-ico" aria-hidden="true" style={{ color: "var(--mode)", background: "color-mix(in srgb, var(--mode) 16%, transparent)", borderColor: "color-mix(in srgb, var(--mode) 35%, transparent)" }}>
            <Icon name={x.kind === "deals" ? "coins" : x.kind === "leads" ? "store" : x.kind === "applicants" ? "users" : "briefcase"} size={18} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}><b>{x.title}</b><span className="muted" style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{LABEL[x.kind]} · {x.sub}</span></span>
          <span className="muted" aria-hidden>›</span>
        </Link>
      ))}
    </>
  );
}
