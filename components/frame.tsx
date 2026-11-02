"use client";
import { usePathname } from "next/navigation";

/** The marketing site and the admin console are full width; everything else lives in the app column. */
export default function Frame({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const kind = path === "/" ? "site" : path === "/admin" || path.startsWith("/admin/") ? "console" : "phone";
  return <div className={kind}>{children}</div>;
}
