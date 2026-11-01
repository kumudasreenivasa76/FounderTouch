"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import I from "@/components/icon";

const TABS = [
  { href: "/app", icon: "qr", label: "Share" },
  { href: "/app/events", icon: "ticket", label: "Events" },
  { href: "/app/contacts", icon: "users", label: "Contacts" },
  { href: "/app/profile", icon: "user", label: "Profile" },
];

const indexOf = (path: string) => Math.max(0, TABS.findIndex((t) => (t.href === "/app" ? path === "/app" : path.startsWith(t.href))));

export default function Tabs() {
  const path = usePathname();
  // Move the highlight the moment a tab is tapped, not when the next page arrives.
  const [pending, setPending] = useState<number | null>(null);
  useEffect(() => setPending(null), [path]);
  const active = pending ?? indexOf(path);
  return (
    <nav className="tabbar" style={{ ["--i" as string]: active }}>
      <span className="glide" aria-hidden />
      {TABS.map((t, n) => (
        <Link key={t.href} href={t.href} className={n === active ? "on" : ""} aria-current={n === active ? "page" : undefined}
          onClick={() => setPending(n)}><I n={t.icon} size={22} />{t.label}</Link>
      ))}
    </nav>
  );
}
