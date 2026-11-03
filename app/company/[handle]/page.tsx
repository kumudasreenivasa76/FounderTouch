import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { db } from "@/lib/db";
import Avatar from "@/components/avatar";
import PageLink from "@/components/page-link";
import { gradient, byline } from "@/lib/look";
export const dynamic = "force-dynamic";

/** One shared company page: everyone on the team appears here, each with their own card and a one-tap save. */
export default async function Company({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const lead = await db.profile.findUnique({ where: { handle } });
  if (!lead || !lead.userId) notFound();
  const m = await db.orgMember.findUnique({ where: { userId: lead.userId }, include: { org: true } });
  if (!m) notFound();
  const members = await db.orgMember.findMany({ where: { orgId: m.orgId }, orderBy: { createdAt: "asc" } });
  const people = await db.profile.findMany({ where: { userId: { in: members.map((x) => x.userId) } } });
  const ordered = members.map((x) => people.find((p) => p.userId === x.userId)).filter((p): p is NonNullable<typeof p> => !!p);
  const owner = ordered.find((p) => members.find((x) => x.userId === p.userId)?.role === "OWNER") ?? lead;
  const company = m.org.company || m.org.name;
  const h = await headers();
  const url = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}/company/${owner.handle}`;
  const logo = owner.logo ? `/logo/${owner.handle}?v=${encodeURIComponent(owner.logo)}` : "";

  return (
    <div role="main" id="main" className="screen fp-page">
      <div className="fp-card fp-top">
        <div className="fp-cover" style={{ background: gradient(owner.theme) }}>{logo && <img className="brand-logo" src={logo} alt={`${company} logo`} />}</div>
        <div className="fp-body">
          <h1 style={{ marginTop: 22 }}>{company}</h1>
          <div className="fp-head">{ordered.length} {ordered.length === 1 ? "person" : "people"} on the team</div>
          {owner.bio && <p className="fp-intro">{owner.bio}</p>}
          {owner.website && <div className="fp-meta">{owner.website.replace(/^https?:\/\//, "")}</div>}
          <PageLink url={url} title={`${company} · team`} />
        </div>
      </div>

      <div className="fp-card">
        <section className="fp-sec">
          <h2>People</h2>
          {ordered.map((p) => (
            <div key={p.id} className="co-person">
              <Avatar name={p.name} handle={p.handle} hasPhoto={!!p.photo} avatar={p.avatar} size={52} />
              <div className="co-who"><b>{p.name}</b><span>{byline(p.headline, "") || p.headline}</span></div>
              <div className="co-acts">
                <Link href={`/${p.handle}?mode=FOUNDER`}>View card</Link>
                <a href={`/${p.handle}/vcard?mode=FOUNDER`}>Save</a>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
