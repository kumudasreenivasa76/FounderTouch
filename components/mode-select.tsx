"use client";
import { useRouter } from "next/navigation";

/** "I am a…" dropdown on the public page. Picking an option opens that mode's page. */
export default function ModeSelect({ handle, options, current, placeholder }: { handle: string; options: { value: string; label: string }[]; current: string; placeholder: string }) {
  const router = useRouter();
  return (
    <select value={options.some((o) => o.value === current) ? current : ""} aria-label={placeholder}
      onChange={(e) => e.target.value && router.push(`/${handle}?mode=${e.target.value}`)} style={{ marginBottom: 0 }}>
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
