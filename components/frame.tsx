"use client";
import { usePathname } from "next/navigation";

/** The marketing site is a full-width scrolling page; everything else lives in the app column. */
export default function Frame({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return <div className={path === "/" ? "site" : "phone"}>{children}</div>;
}
