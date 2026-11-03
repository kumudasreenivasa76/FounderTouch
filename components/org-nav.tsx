import Link from "next/link";

const TABS = [
  { k: "overview", label: "Overview", href: "/app/org" },
  { k: "people", label: "People", href: "/app/org/people" },
  { k: "brand", label: "Brand kit", href: "/app/org/brand", admin: true },
  { k: "leads", label: "Leads", href: "/app/org/leads", admin: true },
  { k: "integrations", label: "Integrations", href: "/app/org/integrations", admin: true },
] as const;

/** Tabs for the team area. Members see Overview and People; admins see everything. */
export default function OrgNav({ active, isAdmin }: { active: (typeof TABS)[number]["k"]; isAdmin: boolean }) {
  return (
    <nav className="chips" aria-label="Team" style={{ overflowX: "auto", flexWrap: "nowrap", margin: "0 0 12px" }}>
      {TABS.filter((t) => isAdmin || !("admin" in t)).map((t) => (
        <Link key={t.k} href={t.href} aria-current={t.k === active ? "page" : undefined} className={"pill" + (t.k === active ? " on" : "")} style={{ padding: "6px 14px", whiteSpace: "nowrap" }}>{t.label}</Link>
      ))}
    </nav>
  );
}
