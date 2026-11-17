"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import Icon from "@/components/icon";

export type NavItem = { href: string; label: string; icon?: string; mode?: string; n?: number };
export type NavGroup = { title: string; items: NavItem[] };

/** The dashboard's side menu. Highlights the current screen, including screens opened in the workspace. */
export default function DashNav({ groups }: { groups: NavGroup[] }) {
  const path = usePathname();
  const qs = useSearchParams().toString();
  const here = path + (qs ? "?" + qs : "");
  const all = groups.flatMap((g) => g.items.map((i) => i.href));
  // The longest menu address that the current address starts with wins, so /dashboard does not light up everywhere.
  const active = all.filter((h) => here === h || here.startsWith(h + "/") || here.startsWith(h + "?") || (h.includes("?") && here.startsWith(h))).sort((a, b) => b.length - a.length)[0] ?? (path === "/dashboard" ? "/dashboard" : "");

  return (
    <nav className="dn" aria-label="Dashboard">
      {groups.map((g) => (
        <div key={g.title} className="dn-group">
          <small>{g.title}</small>
          {g.items.map((i) => (
            <Link key={i.href} href={i.href} aria-current={active === i.href ? "page" : undefined} className={active === i.href ? "on" : ""}>
              <span className="s-ico" aria-hidden>{i.mode ? <Icon mode={i.mode} size={18} /> : <Icon name={i.icon} size={18} />}</span>
              <span className="dn-l">{i.label}</span>
              {typeof i.n === "number" && i.n > 0 && <span className="n">{i.n}</span>}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
