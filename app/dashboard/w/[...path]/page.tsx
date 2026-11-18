import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/auth";

export const metadata = { title: "Workspace" };

/** What each phone-app area is called when it is opened inside the dashboard. The longest match wins. */
const TITLES: [string, string, string][] = [
  ["app/card", "QR, tap and scan", "Share any of your pages by QR code, tap or link."],
  ["app/links", "Link page", "One address for everything you share."],
  ["app/profile/kit", "Kits", "What each of your pages says and shares."],
  ["app/profile/details", "About you", "Your name, photo, headline and bio."],
  ["app/profile/contact", "Contact and socials", "How people reach you."],
  ["app/profile/company", "Company and brand", "Company name, logo, colours and team."],
  ["app/profile/work", "Experience & skills", "Experience, education, skills and resume."],
  ["app/profile/import", "Import your profile", "From LinkedIn or a resume."],
  ["app/nfc", "NFC tags", "Choose which page each tag opens."],
  ["app/contacts/inbox", "Inbox", "Requests waiting for your answer."],
  ["app/contacts/import", "Import contacts", "Bring in a list you already have."],
  ["app/contacts", "Connections", "People, event contacts and applicants."],
  ["app/events", "Events", "Registration, check-in, meals and recruiting."],
  ["app/hire", "Recruiting", "Roles, candidates and talent."],
  ["app/org/leaderboard", "Leaderboard", "Who is getting seen and making contacts."],
  ["app/org", "Team", "Brand kit, directory, leads and team numbers."],
  ["app/integrations", "Integrations", "Zapier, Make, Slack and your API key."],
  ["app/settings", "Card settings", "Colours and options for your cards."],
  ["app/tools", "Tools", "Signature, background and sharing extras."],
  ["app", "Phone app", "The same app you use on your phone."],
];

/** Shows a phone-app screen inside the dashboard, so every feature is reachable without leaving it. */
export default async function Workspace({ params, searchParams }: { params: Promise<{ path: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireOwner();
  const { path } = await params;
  // Only the signed-in app may be shown here, never an outside address.
  if (path[0] !== "app" || path.some((seg) => !/^[\w\-.[\]]+$/.test(seg))) notFound();
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) for (const one of Array.isArray(v) ? v : [v]) if (typeof one === "string") q.append(k, one);
  const rel = path.join("/");
  const src = `/${rel}${q.toString() ? "?" + q.toString() : ""}`;
  const [, title, sub] = TITLES.filter(([p]) => rel === p || rel.startsWith(p + "/")).sort((a, b) => b[0].length - a[0].length)[0] ?? TITLES[TITLES.length - 1];

  return (
    <>
      <div className="dash-top">
        <div>
          <h2>{title}</h2>
          <div className="dash-sub">{sub}</div>
        </div>
        <a className="ws-out" href={src} target="_blank" rel="noopener noreferrer">Open in its own tab</a>
      </div>
      <div className="ws">
        <iframe key={src} src={src} title={title} />
      </div>
    </>
  );
}
