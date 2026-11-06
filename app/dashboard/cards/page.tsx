import Link from "next/link";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { MODE_INFO } from "@/lib/modes";
import { gradient, byline } from "@/lib/look";
import Icon from "@/components/icon";
import CopyButton from "@/components/copy-button";

const LABEL = MODE_INFO as Record<string, { label: string; blurb: string }>;

/** HiHello-style cards page: every card you have, with its QR, numbers and share actions. */
export default async function Cards() {
  const { profile } = await requireOwner();
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const since = new Date(Date.now() - 29 * 864e5); since.setHours(0, 0, 0, 0);

  const [cfgs, links, views, contacts] = await Promise.all([
    db.modeConfig.findMany({ where: { profileId: profile.id } }),
    db.shareLink.findMany({ where: { profileId: profile.id } }),
    db.scanEvent.groupBy({ by: ["mode"], where: { shareLink: { profileId: profile.id }, createdAt: { gte: since } }, _count: true }),
    db.contact.groupBy({ by: ["mode"], where: { profileId: profile.id, status: { not: "BLOCKED" } }, _count: true }),
  ]);
  const added = cfgs.filter((c) => c.added && c.isEnabled && c.mode !== "ALL").map((c) => c.mode);
  const modes = ["ALL", ...added];

  const tiles = await Promise.all(modes.map(async (m) => {
    const l = links.find((x) => x.mode === m);
    const share = l ? `${origin}/s/${l.token}` : `${origin}/${profile.handle}${m === "ALL" ? "" : `?mode=${m}`}`;
    const qr = await QRCode.toString(`${share}?src=qr`, { type: "svg", margin: 0, color: { dark: "#1c2330", light: "#ffffff" } });
    return {
      m, share, qr,
      views: views.find((v) => v.mode === m)?._count ?? 0,
      contacts: contacts.find((c) => c.mode === m)?._count ?? 0,
    };
  }));

  const bg = gradient(profile.theme);
  const sub = byline(profile.headline, profile.company);
  const initials = profile.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <>
      <div className="dash-top">
        <div>
          <h2>Cards</h2>
          <div className="dash-sub">One card for every side of you. Share any of them with its own link and QR.</div>
        </div>
      </div>

      <div className="cards-grid">
        {tiles.map((t) => (
          <div key={t.m} className="dc-tile">
            <div className="dc-face" style={{ background: bg }}>
              <span className="dc-ava" aria-hidden>{initials}</span>
              <b>{profile.name}</b>
              {sub && <span className="dc-sub">{sub}</span>}
              <span className="dc-mode"><Icon mode={t.m} size={13} /> {LABEL[t.m]?.label ?? t.m}{t.m === "ALL" ? " · hub" : ""}</span>
            </div>
            <div className="dc-body">
              <div className="dc-stats">
                <span><b>{t.views}</b> views · 30d</span>
                <span><b>{t.contacts}</b> contacts</span>
              </div>
              <div className="dc-share">
                <div className="dc-qr" aria-label={`QR code for your ${LABEL[t.m]?.label ?? t.m} card`} role="img" dangerouslySetInnerHTML={{ __html: t.qr }} />
                <div className="dc-actions">
                  <CopyButton text={t.share} label="Copy link" />
                  <a className="ghost" href={`/${profile.handle}${t.m === "ALL" ? "" : `?mode=${t.m}`}`} target="_blank" rel="noopener noreferrer">Open page</a>
                  <Link className="ghost" href={t.m === "ALL" ? "/app/card" : `/app/profile/kit?mode=${t.m}`}>Edit card</Link>
                </div>
              </div>
            </div>
          </div>
        ))}

        <Link href="/app/modes" className="dc-tile dc-new">
          <span className="dc-plus" aria-hidden><Icon name="plus" size={24} /></span>
          <b>Add a card</b>
          <span className="muted2">Founder, Investor, Business, Hire me, Recruiter…</span>
        </Link>
      </div>
    </>
  );
}
