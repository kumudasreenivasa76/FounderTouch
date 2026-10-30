"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/app", icon: "▦", label: "Share" },
  { href: "/app/events", icon: "◈", label: "Events" },
  { href: "/app/contacts", icon: "☰", label: "Contacts" },
  { href: "/app/profile", icon: "◉", label: "Profile" },
];

export default function Tabs() {
  const path = usePathname();
  return (
    <nav className="tabbar">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={(t.href === "/app" ? path === "/app" : path.startsWith(t.href)) ? "on" : ""}><b>{t.icon}</b>{t.label}</Link>
      ))}
    </nav>
  );
}
