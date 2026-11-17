import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import Avatar from "@/components/avatar";
import Logo from "@/components/logo";
import Icon from "@/components/icon";
import { SocialBadge, SocialIcon } from "@/components/social-icon";
import { SOCIALS, parseSocials, socialUrl } from "@/lib/socials";
import { autoLinks, hiddenAuto, linkIcon, linkTheme, normUrl } from "@/lib/link-page";

function Glyph({ url }: { url: string }) {
  const g = linkIcon(url);
  return <i className="lt-ic" aria-hidden>{g.social ? <SocialIcon k={g.social} size={18} /> : <Icon name={g.icon} size={18} />}</i>;
}

/**
 * A person's link page: photo, a line about them, and one button for everything they share.
 * It is built from their profile, so it is ready before they add a single link of their own.
 */
export default async function LinkPage({ handle }: { handle: string }) {
  const p = await db.profile.findUnique({ where: { handle }, include: { bioLinks: { where: { enabled: true }, orderBy: { order: "asc" } } } });
  if (!p) notFound();
  const me = await currentUser();
  const isOwner = me?.profile?.id === p.id;
  // Count the visit, but not the owner looking at their own page.
  if (!isOwner) await db.profile.update({ where: { id: p.id }, data: { linkViews: { increment: 1 } } }).catch(() => {});

  const socials = parseSocials(p.socials);
  const socialKeys = SOCIALS.map((s) => s.key).filter((k) => socials[k]);
  // The headline often already names the company ("Founder, Lumen Labs"), so don't repeat it.
  const byline = [p.headline, p.company && !p.headline.toLowerCase().includes(p.company.toLowerCase()) ? p.company : ""].filter(Boolean).join(" · ");
  const hidden = hiddenAuto(p.linkHidden);
  const own = new Set(p.bioLinks.filter((l) => l.kind === "LINK").map((l) => normUrl(l.url)));
  const auto = (await autoLinks(p.id, p.handle)).filter((x) => !hidden.has(x.key) && !own.has(normUrl(x.href)));
  const ownLinks = p.bioLinks.filter((l) => l.kind === "LINK").length;
  const nothing = ownLinks + auto.length === 0;
  const anyFeatured = p.bioLinks.some((l) => l.featured && l.kind === "LINK");

  return (
    <div role="main" id="main" className={"screen lt lt-t-" + linkTheme(p.linkTheme)}>
      <div className="lt-top">
        <span className="lt-ava"><Avatar name={p.name} handle={p.handle} hasPhoto={!!p.photo} avatar={p.avatar} size={96} /></span>
        <h1>{p.name}</h1>
        {byline && <p className="lt-by">{byline}</p>}
        {p.bio && <p className="lt-bio">{p.bio}</p>}
        {socialKeys.length > 0 && (
          <div className="lt-soc">
            {socialKeys.map((k) => (
              <a key={k} href={socialUrl(k, socials[k]!)} target="_blank" rel="noopener noreferrer" aria-label={SOCIALS.find((s) => s.key === k)?.label ?? k}><SocialBadge k={k} size={40} /></a>
            ))}
          </div>
        )}
      </div>

      <div className="lt-links">
        {p.bioLinks.map((l, i) => {
          if (l.kind === "HEADER") return <h2 key={l.id} className="lt-head">{l.title}</h2>;
          // With no featured link chosen, the first link takes the highlight.
          const cls = "lt-link" + (l.featured || (!anyFeatured && i === p.bioLinks.findIndex((x) => x.kind === "LINK")) ? " feat" : "");
          return /^https?:/i.test(l.url)
            ? <a key={l.id} className={cls} href={`/${p.handle}/links/go/${l.id}`} target="_blank" rel="noopener noreferrer"><Glyph url={l.url} /><span>{l.title}</span></a>
            : <a key={l.id} className={cls} href={l.url}><Glyph url={l.url} /><span>{l.title}</span></a>;
        })}
        {auto.map((x, i) => {
          const cls = "lt-link" + (ownLinks === 0 && i === 0 ? " feat" : "");
          const inner = <><i className="lt-ic" aria-hidden>{x.mode ? <Icon mode={x.mode} size={18} /> : <Icon name={x.icon} size={18} />}</i><span>{x.title}</span></>;
          return x.external
            ? <a key={x.key} className={cls} href={x.href} target="_blank" rel="noopener noreferrer">{inner}</a>
            : <Link key={x.key} className={cls} href={x.href}>{inner}</Link>;
        })}
        {nothing && <p className="lt-empty">{isOwner ? "Nothing to show yet. Add a link or set up a mode." : `${p.name} hasn't added anything yet.`}</p>}
      </div>

      <div className="lt-actions">
        <a className="lt-ghost" href={`/${p.handle}/vcard`}>Save contact</a>
        <Link className="lt-ghost" href={`/${p.handle}/card`}>Full profile</Link>
      </div>
      {isOwner && <Link className="lt-own" href="/app/links">Edit my link page</Link>}

      <Link className="lt-foot" href="/">
        <Logo size={22} />
        <span className="brand-word">Tap<span>Nodd</span></span>
      </Link>
    </div>
  );
}
