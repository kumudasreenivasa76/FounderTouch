import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { MODES, MODE_INFO } from "@/lib/modes";
import { gradient } from "@/lib/look";
import { parseBgPrefs } from "@/lib/background";
import BackgroundStudio from "@/components/background-studio";
import { saveBgPrefs } from "../studio-actions";

export const metadata = { title: "Virtual background" };

/** Virtual background studio: six designs for Zoom, Meet and Teams, with your name and a scannable QR. */
export default async function Backgrounds() {
  const { profile } = await requireOwner();
  const [links, cfgs] = await Promise.all([
    db.shareLink.findMany({ where: { profileId: profile.id }, select: { mode: true } }),
    db.modeConfig.findMany({ where: { profileId: profile.id, isEnabled: true }, select: { mode: true } }),
  ]);
  const ok = new Set(cfgs.map((c) => c.mode).filter((m) => links.some((l) => l.mode === m)));
  const pages = MODES.filter((m) => ok.has(m)).map((m) => ({ mode: m as string, label: m === "ALL" ? "My full profile" : `${MODE_INFO[m].label} page` }));
  // "All" first, since it is the safest thing to show a mixed audience.
  pages.sort((a, b) => (a.mode === "ALL" ? -1 : b.mode === "ALL" ? 1 : 0));

  return (
    <>
      <div className="dash-top">
        <div>
          <h2>Virtual background</h2>
          <div className="dash-sub">Be scannable on every video call. Your name and QR sit at the edges, and the middle stays clear for you.</div>
        </div>
      </div>
      {pages.length === 0
        ? <div className="panel"><p className="muted2" style={{ margin: 0 }}>Switch on at least one page first, then come back to make a background. <Link href="/dashboard/w/app/card">Go to Card &amp; scan</Link></p></div>
        : <BackgroundStudio handle={profile.handle} brand={gradient(profile.theme)} pages={pages} initial={parseBgPrefs(profile.bgPrefs)} hasLogo={!!profile.logo} save={saveBgPrefs} />}
      <p className="muted2" style={{ marginTop: 14 }}>Presenting at an event? <Link href="/dashboard/w/app/booth">Booth mode</Link> shows a full-screen QR people can scan from a distance.</p>
    </>
  );
}
