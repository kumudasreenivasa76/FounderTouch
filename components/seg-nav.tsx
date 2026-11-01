"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import I from "@/components/icon";

const ITEMS = [
  { key: "qr", href: "/app", icon: "qr", label: "QR code" },
  { key: "tap", href: "/app?via=tap", icon: "nfc", label: "Tap" },
  { key: "scan", href: "/app?via=scan", icon: "scan", label: "Scan" },
];

/** QR / Tap / Scan switch. The thumb slides as soon as you tap, before the server answers. */
export default function SegNav({ via }: { via: string }) {
  const current = Math.max(0, ITEMS.findIndex((x) => x.key === via));
  const [pending, setPending] = useState<number | null>(null);
  useEffect(() => setPending(null), [via]);
  const active = pending ?? current;
  return (
    <nav className="seg" aria-label="How to share" style={{ ["--i" as string]: active }}>
      <span className="thumb" aria-hidden />
      {ITEMS.map((x, n) => (
        <Link key={x.key} href={x.href} scroll={false} className={n === active ? "on" : ""} onClick={() => setPending(n)}>
          <I n={x.icon} size={16} /> {x.label}
        </Link>
      ))}
    </nav>
  );
}
