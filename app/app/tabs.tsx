"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import I from "@/components/icon";

const TABS = [
  { href: "/app", icon: "qr", label: "Share" },
  { href: "/app/events", icon: "ticket", label: "Events" },
  { href: "/app/contacts", icon: "users", label: "Contacts" },
  { href: "/app/profile", icon: "user", label: "Profile" },
];

export default function Tabs() {
  const path = usePathname();
  return (
    <nav className="tabbar">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={(t.href === "/app" ? path === "/app" : path.startsWith(t.href)) ? "on" : ""}><I n={t.icon} size={22} />{t.label}</Link>
      ))}
    </nav>
  );
}
