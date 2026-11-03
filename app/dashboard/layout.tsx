import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { MODES, MODE_INFO } from "@/lib/modes";
import "./dashboard.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "CRM dashboard" };

/** Desktop CRM dashboard: one overview plus one CRM view per mode. */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireOwner();
  const counts = await db.contact.groupBy({ by: ["mode"], where: { profileId: profile.id, status: { not: "BLOCKED" } }, _count: true });
  const per = Object.fromEntries(counts.map((c) => [c.mode, c._count]));
  return (
    <div className="dash">
      <aside className="dash-side">
        <h1>FounderTouch CRM</h1>
        <Link href="/dashboard">▦ Overview</Link>
        <small>Modes</small>
        {MODES.map((m) => (
          <Link key={m} href={`/dashboard/${m.toLowerCase()}`}>
            <span aria-hidden>{MODE_INFO[m].icon}</span>{MODE_INFO[m].label}<span className="n">{per[m] ?? 0}</span>
          </Link>
        ))}
        <small>More</small>
        <Link href="/app/events">◈ Events</Link>
        <Link href="/app/hire">Recruiting</Link>
        <Link href="/app/contacts/export">Export contacts</Link>
        <Link href="/app">← Back to the app</Link>
      </aside>
      <main className="dash-main">{children}</main>
    </div>
  );
}
