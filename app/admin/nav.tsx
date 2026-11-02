"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import I from "@/components/icon";

const ITEMS = [
  { href: "/admin", icon: "layers", label: "Overview" },
  { href: "/admin/users", icon: "users", label: "Users" },
  { href: "/admin/onboarding", icon: "send", label: "Onboarding" },
  { href: "/admin/events", icon: "ticket", label: "Events" },
  { href: "/admin/jobs", icon: "briefcase", label: "Hiring" },
  { href: "/admin/content", icon: "folder", label: "Content" },
  { href: "/admin/audit", icon: "file", label: "Audit log" },
  { href: "/admin/settings", icon: "settings", label: "Settings" },
];

export default function AdminNav() {
  const path = usePathname();
  return (
    <nav className="ad-nav" aria-label="Admin">
      {ITEMS.map((x) => {
        const on = x.href === "/admin" ? path === "/admin" : path.startsWith(x.href);
        return <Link key={x.href} href={x.href} className={on ? "on" : ""} aria-current={on ? "page" : undefined}><I n={x.icon} size={17} />{x.label}</Link>;
      })}
    </nav>
  );
}
