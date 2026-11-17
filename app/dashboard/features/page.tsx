import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import Icon from "@/components/icon";

export const metadata = { title: "Features" };

type Status = "ready" | "setup" | "no";
type Feature = { name: string; status: Status; href?: string; note?: string };
type Group = { title: string; icon: string; blurb: string; items: Feature[] };

const LABEL: Record<Status, string> = { ready: "Ready", setup: "Needs setup", no: "Not built yet" };

/** Everything a digital-card product is expected to do, and where each one stands in TapNodd today. */
const GROUPS: Group[] = [
  { title: "Cards and sharing", icon: "card", blurb: "Getting your card into someone's hands.", items: [
    { name: "A card for each side of you (modes)", status: "ready", href: "/app/card" },
    { name: "QR code sharing", status: "ready", href: "/app/card" },
    { name: "Share by link, text, email and WhatsApp", status: "ready", href: "/app/card" },
    { name: "Personal address: /you and /you/founder", status: "ready", href: "/app/card", note: "Each page has its own short link." },
    { name: "Link page (link in bio)", status: "ready", href: "/app/links", note: "Built from your profile, with looks, headings and click counts." },
    { name: "Tap to share and NFC tags", status: "ready", href: "/app/nfc" },
    { name: "Offline card", status: "ready", href: "/app", note: "Your QR still works with no signal." },
    { name: "Apple and Google Wallet", status: "setup", href: "/app/card?pane=wallet", note: "Needs wallet keys added on the server." },
    { name: "Home-screen widget and live activity", status: "no", note: "Needs a native phone app." },
  ] },
  { title: "Design and brand", icon: "spark", blurb: "Making the card look like you.", items: [
    { name: "Card colours, including your own", status: "ready", href: "/app/settings" },
    { name: "Company logo on the card", status: "ready", href: "/app/profile/kit?mode=FOUNDER&tab=brand" },
    { name: "Video, documents and PDFs on a page", status: "ready", href: "/app/profile/kit" },
    { name: "QR with your photo in the centre", status: "ready", href: "/app/card" },
    { name: "Six looks for the link page", status: "ready", href: "/app/links#look" },
    { name: "Hide your pages from search engines", status: "ready", href: "/app/links", note: "One switch on the link page editor." },
    { name: "Team brand kit that locks colours and logo", status: "ready", href: "/app/org/brand" },
    { name: "Card templates to choose from", status: "no" },
    { name: "Custom fonts", status: "no" },
    { name: "Verified badge", status: "no" },
  ] },
  { title: "Email signatures and backgrounds", icon: "mail", blurb: "Your card in every email and video call.", items: [
    { name: "Email signature studio with six designs", status: "ready", href: "/dashboard/signature", note: "Photo, logo, QR, socials and a link to your card." },
    { name: "Legal note under the signature", status: "ready", href: "/dashboard/signature" },
    { name: "Signature clicks counted in Analytics", status: "ready", href: "/dashboard" },
    { name: "Team banner in the signature", status: "ready", href: "/app/org/brand" },
    { name: "Virtual background studio with six designs", status: "ready", href: "/dashboard/backgrounds", note: "Choose what shows and where the QR sits." },
    { name: "Automatic rollout to Gmail and Outlook", status: "no" },
    { name: "Scheduled banner campaigns", status: "no" },
  ] },
  { title: "Contacts", icon: "users", blurb: "Remembering who you met and following up.", items: [
    { name: "Unlimited contacts with notes, tags and follow-ups", status: "ready", href: "/app/contacts" },
    { name: "Connection requests inbox", status: "ready", href: "/app/contacts/inbox" },
    { name: "Scan someone else's QR code", status: "ready", href: "/app/card?via=scan" },
    { name: "Import and export contacts", status: "ready", href: "/app/contacts/import" },
    { name: "Fill your profile from LinkedIn or a resume", status: "ready", href: "/app/profile/import", note: "PDF resumes need one extra package installed." },
    { name: "Desktop CRM, one view per mode", status: "ready", href: "/dashboard/all" },
    { name: "Scan paper cards and badges", status: "no", note: "Needs text recognition." },
    { name: "Automatic contact enrichment", status: "no", note: "Needs a paid data provider." },
  ] },
  { title: "Events", icon: "calendar", blurb: "From registration to follow-up.", items: [
    { name: "Event pages and registration", status: "ready", href: "/app/events" },
    { name: "Check-in scanning and meal vouchers", status: "ready", href: "/app/events" },
    { name: "Booth mode for collecting leads", status: "ready", href: "/app/booth" },
    { name: "Recruiting at events, with consent", status: "ready", href: "/app/events" },
    { name: "Export event leads", status: "ready", href: "/app/events" },
    { name: "Custom lead forms", status: "no" },
  ] },
  { title: "Analytics", icon: "chart", blurb: "Knowing what works.", items: [
    { name: "Views, saves and new contacts, with trends", status: "ready", href: "/dashboard" },
    { name: "Where views came from: QR, link, NFC, tap", status: "ready", href: "/dashboard" },
    { name: "Link page views, clicks and click rate", status: "ready", href: "/app/links" },
    { name: "Scans per mode, last 7 days", status: "ready", href: "/app/card" },
    { name: "Team leaderboard", status: "ready", href: "/app/org/leaderboard" },
  ] },
  { title: "Team", icon: "building", blurb: "Running cards for a whole company.", items: [
    { name: "Team workspace and invites", status: "ready", href: "/app/org" },
    { name: "Company directory", status: "ready", href: "/app/org/people" },
    { name: "Shared team leads", status: "ready", href: "/app/org/leads" },
    { name: "Directory sync, SAML and SCIM", status: "no" },
  ] },
  { title: "Integrations and sign-in", icon: "plug", blurb: "Connecting to the tools you already use.", items: [
    { name: "Zapier, Make and Slack", status: "ready", href: "/app/integrations" },
    { name: "API key and contacts API", status: "ready", href: "/app/integrations" },
    { name: "Booking pages: Calendly, Cal.com, Google Calendar", status: "ready", href: "/app/profile/kit?mode=FOUNDER&tab=actions" },
    { name: "Sign in with Google, Microsoft or Apple", status: "setup", note: "Needs sign-in keys added on the server." },
    { name: "Direct Salesforce, HubSpot and Dynamics sync", status: "no", note: "Possible today through Zapier or Make." },
  ] },
];

export default async function Features() {
  await requireOwner();
  const all = GROUPS.flatMap((g) => g.items);
  const count = (s: Status) => all.filter((f) => f.status === s).length;
  return (
    <>
      <div className="dash-top">
        <div>
          <h2>Features</h2>
          <div className="dash-sub">Everything TapNodd does today, where to find it, and what is not built yet. Everything opens here in the dashboard.</div>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi"><span className="k-lbl">Ready to use</span><b>{count("ready")}</b><span>of {all.length} features</span></div>
        <div className="kpi"><span className="k-lbl">Needs setup</span><b>{count("setup")}</b><span>keys to add on the server</span></div>
        <div className="kpi"><span className="k-lbl">Not built yet</span><b>{count("no")}</b><span>on the list for later</span></div>
      </div>

      <div className="fx-grid">
        {GROUPS.map((g) => (
          <section key={g.title} className="panel fx">
            <header>
              <i aria-hidden><Icon name={g.icon} size={20} /></i>
              <div><h3>{g.title}</h3><p>{g.blurb}</p></div>
              <span className="fx-n">{g.items.filter((f) => f.status === "ready").length}/{g.items.length}</span>
            </header>
            <ul>
              {g.items.map((f) => {
                const body = (
                  <>
                    <span className={"fx-dot " + f.status} aria-hidden />
                    <span className="fx-t"><b>{f.name}</b>{f.note && <small>{f.note}</small>}</span>
                    <span className={"fx-tag " + f.status}>{LABEL[f.status]}</span>
                  </>
                );
// Phone-app screens open in the dashboard workspace, so the dashboard stays put.
                const to = f.href?.startsWith("/app") ? `/dashboard/w${f.href}` : f.href;
                return <li key={f.name}>{to ? <Link href={to}>{body}</Link> : <div>{body}</div>}</li>;
              })}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
