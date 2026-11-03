import Link from "next/link";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { avatarBg } from "@/lib/avatar-color";
import { byline } from "@/lib/look";
import { listItems } from "@/lib/modes";
import { skillMatch } from "@/lib/hiring";
import PageHead from "@/components/page-head";
import { inviteTalent } from "../actions";
export const dynamic = "force-dynamic";
export const metadata = { title: "Find talent" };

const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

/** People with a Hire me profile. Search by skill or name, see who matches a role, and invite them to apply. */
export default async function Talent({ searchParams }: { searchParams: Promise<{ q?: string; job?: string; open?: string }> }) {
  const sp = await searchParams;
  const { profile } = await requireOwner();
  const q = (sp.q ?? "").trim();
  const openOnly = sp.open === "1";
  const jobs = await db.job.findMany({ where: { profileId: profile.id, open: true }, orderBy: { createdAt: "desc" } });
  const job = jobs.find((j) => j.id === sp.job) ?? jobs[0];
  const found = await db.profile.findMany({
    where: {
      id: { not: profile.id }, userId: { not: null },
      ...(openOnly ? { openTo: { notIn: ["", "Not looking"] } } : { OR: [{ openTo: { notIn: ["", "Not looking"] } }, { skills: { not: "" } }] }),
      ...(q ? { AND: [{ OR: [{ name: { contains: q } }, { headline: { contains: q } }, { skills: { contains: q } }, { company: { contains: q } }] }] } : {}),
    },
    take: 40,
  });
  const invited = job ? await db.invite.findMany({ where: { jobId: job.id } }) : [];
  const scored = found.map((p) => ({ p, m: job ? skillMatch(job.skills, p.skills) : { hit: 0, total: 0 } }))
    .sort((a, b) => b.m.hit - a.m.hit || Number(!!b.p.openTo) - Number(!!a.p.openTo));
  const back = `/app/hire/talent?${new URLSearchParams({ ...(q ? { q } : {}), ...(job ? { job: job.id } : {}), ...(openOnly ? { open: "1" } : {}) })}`;

  return (
    <>
      <PageHead title="Find talent" sub="People who have a Hire me profile." back="/app/hire" />
      <form method="get" role="search" className="card">
        <label className="f" htmlFor="t-q">Skill, name or role</label>
        <input id="t-q" name="q" defaultValue={q} placeholder="e.g. Figma, product designer" />
        {jobs.length > 0 && <><label className="f" htmlFor="t-job">Match and invite for</label><select id="t-job" name="job" defaultValue={job?.id}>{jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}</select></>}
        <label style={{ display: "block", margin: "8px 0" }}><input type="checkbox" name="open" value="1" defaultChecked={openOnly} />Only people who are open to work</label>
        <button>Search</button>
      </form>
      {jobs.length === 0 && <div className="card muted">Post a role first to see skill matches and send invites. <Link href="/app/hire/new">Post a role</Link></div>}

      {scored.length === 0 && <div className="card muted">Nobody matches yet.</div>}
      {scored.map(({ p, m }) => {
        const done = invited.some((i) => i.candidateProfileId === p.id);
        return (
          <article className="card" key={p.id} style={{ padding: 12 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <span className="av" style={{ background: avatarBg(p.handle) }} aria-hidden>{initials(p.name)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link href={`/${p.handle}?mode=HIRE`} style={{ color: "inherit" }} target="_blank"><b>{p.name}</b></Link>
                <div className="muted">{byline(p.headline, p.company) || `@${p.handle}`}</div>
                <div style={{ marginTop: 4 }}>
                  {p.openTo && p.openTo !== "Not looking" && <span className="pill" style={{ margin: "0 4px 4px 0" }}>{p.openTo}</span>}
                  {job && m.total > 0 && <span className="pill" style={{ margin: "0 4px 4px 0" }}>{m.hit}/{m.total} skills match</span>}
                </div>
                <div>{listItems(p.skills).slice(0, 5).map((s) => <span key={s} className="pill" style={{ margin: "0 4px 4px 0" }}>{s}</span>)}</div>
              </div>
            </div>
            {job && (done
              ? <div className="muted" style={{ marginTop: 6 }}>✓ Invited to apply for {job.title}</div>
              : <form action={inviteTalent} style={{ marginTop: 8 }}><input type="hidden" name="jobId" value={job.id} /><input type="hidden" name="profileId" value={p.id} /><input type="hidden" name="back" value={back} /><button aria-label={`Invite to apply: ${p.name}, ${job.title}`}>Invite to apply</button></form>)}
          </article>
        );
      })}
    </>
  );
}
