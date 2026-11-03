"use client";
import { usePathname } from "next/navigation";

/** Swipe screens fill the phone and handle their own scrolling; everything else is one scrolling screen. */
const FILL = ["/app/card", "/app/profile/kit"];

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return <div role="main" id="main" className={FILL.includes(path) ? "shell" : "screen"}>{children}</div>;
}
