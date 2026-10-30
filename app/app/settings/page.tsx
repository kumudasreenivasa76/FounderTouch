import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { MODES, MODE_INFO } from "@/lib/modes";
import { THEMES, isCustomTheme, themeOf } from "@/lib/look";
import { bookingInfo } from "@/lib/booking";
import PageHead from "@/components/page-head";
import BrandForm from "@/components/brand-form";
import ModePanels from "@/components/mode-panels";
import { saveBrand } from "../profile/actions";
import { saveMode, setTheme } from "./actions";
import { headers } from "next/headers";
export const dynamic = "force-dynamic";

/** Everything that changes how your card and pages look and behave, in one place. */
export default async function Settings({ searchParams }: { searchParams: Promise<{ saved?: string; mode?: string; err?: string }> }) {
  const sp = await searchParams;
  const { profile } = await requireOwner();
  const cfgs = await db.modeConfig.findMany({ where: { profileId: profile.id } });
  const h = await headers();
  const host = h.get("host") ?? "";
  const start = Math.max(0, MODES.findIndex((m) => m === sp.mode));
  const t = themeOf(profile.theme);
  return (
    <>
      <PageHead title="Card settings" sub="Colours, logo and how each of your pages behaves." back="/app" saved={!!sp.saved} error={sp.err === "logo" ? "The logo must be a PNG, JPG or WebP under 2 MB." : undefined} />

      <div className="card">
        <h3>Card colour</h3>
        <form action={setTheme} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {Object.entries(THEMES).map(([k, th]) => (
            <button key={k} name="theme" value={k} aria-label={th.name} title={th.name}
              style={{ width: 42, height: 42, padding: 0, borderRadius: "50%", background: `linear-gradient(135deg, ${th.from}, ${th.to})`, border: profile.theme === k ? "3px solid #111827" : "3px solid #fff", boxShadow: "0 0 0 1px #cfd4dd" }} />
          ))}
        </form>
        {isCustomTheme(profile.theme) && <p className="muted" style={{ margin: "10px 0 0" }}>You are using your own company colours. Pick a preset to switch back.</p>}
      </div>

      <BrandForm action={saveBrand} ret="settings" company={profile.company} logoSrc={profile.logo ? `/logo/${profile.handle}?v=${encodeURIComponent(profile.logo)}` : ""} color1={t.from} color2={t.to} />

      <h2>Page settings</h2>
      <ModePanels title="Choose a mode" initial={start} labels={MODES.map((m) => `${MODE_INFO[m].icon} ${MODE_INFO[m].label}`)}>
        {MODES.map((m) => {
          const c = cfgs.find((x) => x.mode === m);
          const info = MODE_INFO[m];
          const book = c?.bookingUrl ? bookingInfo(c.bookingUrl, host) : null;
          return (
            <form key={m} action={saveMode} className="card">
              <input type="hidden" name="mode" value={m} />
              <h3 style={{ marginTop: 0 }}>{info.icon} {info.label}</h3>
              <label style={{ display: "block", margin: "6px 0 2px" }}><input type="checkbox" name="approval" defaultChecked={!!c?.requireApproval} /><b>🔒 Visitors need my approval</b></label>
              <p className="muted" style={{ margin: "0 0 8px" }}>People who scan see only your name and a request form until you approve them in Contacts.</p>
              <label className="f">Intro message</label>
              <textarea name="intro" rows={2} maxLength={240} defaultValue={c?.intro ?? ""} placeholder={`A short hello for ${info.label.toLowerCase()} visitors`} />
              <label className="f">Button label</label>
              <input name="cta" defaultValue={c?.ctaLabel ?? info.cta} />
              <label className="f">Booking link</label>
              <input name="url" defaultValue={c?.bookingUrl ?? ""} placeholder="Calendly, Cal.com, Google Calendar, Microsoft Bookings…" inputMode="url" autoCapitalize="none" />
              <p className="muted" style={{ margin: "0 0 8px" }}>{book ? `${book.icon} ${book.provider}${book.embed ? " · visitors book right on your page" : " · opens the booking page"}` : "Paste any scheduling link. Calendly, Cal.com and Google Calendar show inside your page."}</p>
              {m !== "ALL" && <label style={{ display: "block", margin: "8px 0" }}><input type="checkbox" name="on" value="off" defaultChecked={c?.isEnabled === false} />Hide this mode for now</label>}
              <button>Save {info.label} settings</button>
            </form>
          );
        })}
      </ModePanels>
    </>
  );
}
