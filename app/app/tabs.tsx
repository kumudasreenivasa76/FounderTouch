"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/icon";

/** The design's bottom bar: Home, Discover, the raised Create button, Connections, Profile. */
const TABS = [
  { href: "/app", icon: "home", label: "Home", match: (p: string) => p === "/app" },
  { href: "/app/discover", icon: "search", label: "Discover", match: (p: string) => p.startsWith("/app/discover") || p.startsWith("/app/opportunities") || p.startsWith("/app/events") },
  { href: "/app/contacts", icon: "users", label: "Connections", match: (p: string) => p.startsWith("/app/contacts") },
  { href: "/app/profile", icon: "user", label: "Profile", match: (p: string) => p.startsWith("/app/profile") || p.startsWith("/app/more") || p.startsWith("/app/settings") || p.startsWith("/app/card") || p.startsWith("/app/links") || p.startsWith("/app/share") || p.startsWith("/app/kits") },
];

const CREATE = [
  { href: "/app/share", icon: "share", title: "Share my card", sub: "QR, tap or link", tint: "" },
  { href: "/app/contacts/new", icon: "user", title: "Add connection", sub: "Type, scan or import", tint: "" },
  { href: "/app/card?pane=add", icon: "grid", title: "New mode", sub: "Founder, Investor and more", tint: "" },
  { href: "/app/events", icon: "calendar", title: "Create event", sub: "Tickets and check-in", tint: "g" },
  { href: "/app/hire/new", icon: "briefcase", title: "Post a role", sub: "Hire through TapNodd", tint: "o" },
  { href: "/app/profile/projects", icon: "rocket", title: "Add project", sub: "Show your work", tint: "b" },
];

export default function Tabs() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);
  const tab = (t: (typeof TABS)[number]) => {
    const on = t.match(path);
    return <Link key={t.href} href={t.href} className={on ? "on" : ""} aria-current={on ? "page" : undefined}><b aria-hidden><Icon name={t.icon} size={22} /></b>{t.label}</Link>;
  };
  return (
    <>
      <nav className="tabbar" aria-label="Main">
        {tab(TABS[0])}{tab(TABS[1])}
        <button type="button" className="tab-fab" aria-label="Create" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}><b aria-hidden><Icon name="plus" size={26} /></b></button>
        {tab(TABS[2])}{tab(TABS[3])}
      </nav>
      {open && (
        <div className="d-sheet-wrap" onClick={() => setOpen(false)}>
          <div className="d-sheet" role="dialog" aria-modal="true" aria-labelledby="create-h" onClick={(e) => e.stopPropagation()}>
            <span className="d-grab" aria-hidden />
            <div className="d-sheet-h"><h2 id="create-h">Create</h2><button ref={closeRef} type="button" className="d-ibtn" aria-label="Close" onClick={() => setOpen(false)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg></button></div>
            <div className="d-create">
              {CREATE.map((c) => (
                <Link key={c.title} href={c.href} className="d-ctile">
                  <span className={`d-ico ${c.tint}`} aria-hidden><Icon name={c.icon} /></span>
                  <span><b>{c.title}</b><span>{c.sub}</span></span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
