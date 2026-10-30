"use client";
import { usePathname, useRouter } from "next/navigation";

/** A dropdown that reloads the current screen with ?param=value, so the page can render per choice. */
export default function QuerySelect({ options, current, param = "mode", label }: { options: { value: string; label: string }[]; current: string; param?: string; label: string }) {
  const router = useRouter();
  const path = usePathname();
  return (
    <select value={current} aria-label={label} onChange={(e) => router.push(`${path}?${param}=${encodeURIComponent(e.target.value)}`)} style={{ fontWeight: 600, marginTop: 0 }}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
