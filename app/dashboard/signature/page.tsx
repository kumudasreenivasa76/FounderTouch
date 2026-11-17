import { headers } from "next/headers";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { membership } from "@/lib/org";
import { MODES, MODE_INFO } from "@/lib/modes";
import { buildBanner, parseSigPrefs, sigData } from "@/lib/signature";
import SignatureStudio from "@/components/signature-studio";
import { saveSigPrefs } from "../studio-actions";

export const metadata = { title: "Email signature" };

/** Email signature studio: six designs, live preview, and one-press copy into Gmail, Outlook or Apple Mail. */
export default async function Signature() {
  const { user, profile } = await requireOwner();
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const team = await membership(user.id);
  const [links, cfgs] = await Promise.all([
    db.shareLink.findMany({ where: { profileId: profile.id }, orderBy: { id: "asc" } }),
    db.modeConfig.findMany({ where: { profileId: profile.id, isEnabled: true }, select: { mode: true } }),
  ]);
  const on = new Set(cfgs.map((c) => c.mode));
  // One entry per page that is switched on. "src=email" lets Analytics show signature clicks on their own line.
  const pages = [
    { mode: "LINKS", label: "My link page", url: `${origin}/${profile.handle}` },
    ...MODES.filter((m) => on.has(m)).flatMap((m) => {
      const l = links.find((x) => x.mode === m);
      return l ? [{ mode: m as string, label: m === "ALL" ? "My full profile" : `${MODE_INFO[m].label} page`, url: `${origin}/s/${l.token}?src=email` }] : [];
    }),
  ];
  const prefs = parseSigPrefs(profile.sigPrefs);
  const { cardUrl: _c, qrUrl: _q, ...base } = sigData(profile, origin, "", buildBanner(team?.org, profile.theme));
  void _c; void _q;

  return (
    <>
      <div className="dash-top">
        <div>
          <h2>Email signature</h2>
          <div className="dash-sub">Your card at the bottom of every email. Pick a design, choose what to show, then copy it into your mail app.</div>
        </div>
      </div>
      <SignatureStudio base={base} pages={pages} qrBase={`${origin}/card/${profile.handle}/qr`} initial={prefs} hasPhoto={!!profile.photo} hasLogo={!!profile.logo} save={saveSigPrefs} />
    </>
  );
}
