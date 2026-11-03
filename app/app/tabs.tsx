"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/icon";

const TABS = [
  { href: "/app", icon: "home", label: "Home", also: [] as string[], only: true },
  { href: "/app/card", icon: "card", label: "Card & scan", also: ["/app/profile/kit", "/app/nfc", "/app/scan"], only: false },
  { href: "/app/contacts", icon: "users", label: "Connections", also: [] as string[], only: false },
  { href: "/app/more", icon: "more", label: "More", also: ["/app/events", "/app/settings", "/app/org", "/app/tools", "/app/integrations", "/app/hire"], only: false },
];

export default function Tabs() {
  const path = usePathname();
  const on = (t: (typeof TABS)[number]) => (t.only ? path === t.href || (path.startsWith("/app/profile") && !path.startsWith("/app/profile/kit")) : path.startsWith(t.href) || t.also.some((a) => path.startsWith(a)));
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={on(t) ? "on" : ""} aria-current={on(t) ? "page" : undefined}><b aria-hidden><Icon name={t.icon} size={22} /></b>{t.label}</Link>
      ))}
    </nav>
  );
}
