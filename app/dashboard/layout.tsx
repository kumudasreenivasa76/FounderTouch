import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { MODES, MODE_INFO } from "@/lib/modes";
import Icon from "@/components/icon";
import Logo from "@/components/logo";
import "./dashboard.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

/** Desktop dashboard: an analytics overview plus one CRM view per mode. */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireOwner();
  const counts = await db.contact.groupBy({ by: ["mode"], where: { profileId: profile.id, status: { not: "BLOCKED" } }, _count: true });
  const per = Object.fromEntries(counts.map((c) => [c.mode, c._count]));
  return (
    <div className="dash">
      <aside className="dash-side">
        <h1 className="brand-word side-brand"><Logo size={26} />Tap<span>Nodd</span></h1>
        <Link href="/dashboard"><span className="s-ico" aria-hidden><Icon name="chart" size={18} /></span>Analytics</Link>
        <Link href="/dashboard/cards"><span className="s-ico" aria-hidden><Icon name="card" size={18} /></span>Cards</Link>
        <Link href="/dashboard/all"><span className="s-ico" aria-hidden><Icon name="users" size={18} /></span>Contacts<span className="n">{Object.values(per).reduce((a, b) => a + b, 0)}</span></Link>
        <small>CRM by card</small>
        {MODES.map((m) => (
          <Link key={m} href={`/dashboard/${m.toLowerCase()}`}>
            <span className="s-ico" aria-hidden><Icon mode={m} size={18} /></span>{MODE_INFO[m].label}<span className="n">{per[m] ?? 0}</span>
          </Link>
        ))}
        <small>Tools</small>
        <Link href="/dashboard/signature"><span className="s-ico" aria-hidden><Icon name="mail" size={18} /></span>Email signature</Link>
        <Link href="/dashboard/backgrounds"><span className="s-ico" aria-hidden><Icon name="video" size={18} /></span>Virtual background</Link>
        <Link href="/app/events"><span className="s-ico" aria-hidden><Icon name="calendar" size={18} /></span>Events</Link>
        <Link href="/app/hire"><span className="s-ico" aria-hidden><Icon name="target" size={18} /></span>Recruiting</Link>
        <Link href="/app/contacts/export?format=csv"><span className="s-ico" aria-hidden><Icon name="download" size={18} /></span>Export contacts</Link>
        <Link href="/app"><span className="s-ico" aria-hidden><Icon name="home" size={18} /></span>Back to the app</Link>
      </aside>
      <main className="dash-main">{children}</main>
    </div>
  );
}
