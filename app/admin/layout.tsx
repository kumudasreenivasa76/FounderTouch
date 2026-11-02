import Link from "next/link";
import I from "@/components/icon";
import { requireAdmin } from "@/lib/platform";
import AdminNav from "./nav";
import "./admin.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "FounderTouch Admin" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin();
  return (
    <div className="ad">
      <aside className="ad-side">
        <Link href="/admin" className="ad-brand"><span>ft</span><div><b>FounderTouch</b><small>Admin</small></div></Link>
        <AdminNav />
        <div className="ad-me">
          <div className="ad-me-ava">{me.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}</div>
          <div><b>{me.name}</b><small>{me.email}</small></div>
          <Link href="/" className="ad-icon-btn" title="View the site" aria-label="View the site"><I n="external" size={16} /></Link>
        </div>
      </aside>
      <main className="ad-main">{children}</main>
    </div>
  );
}
