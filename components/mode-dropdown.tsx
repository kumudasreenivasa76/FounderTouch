"use client";
import { useRouter } from "next/navigation";

/** Home dropdown: lists only the modes that are set up. Picking one opens it on the Card tab. */
export default function ModeDropdown({ options }: { options: { value: string; label: string }[] }) {
  const router = useRouter();
  return (
    <select defaultValue="" aria-label="Your modes" style={{ margin: 0 }}
      onChange={(e) => { const v = e.target.value; if (v) router.push(v === "__add" ? "/app/card?pane=add" : `/app/card?mode=${v}`); }}>
      <option value="">Choose a mode…</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      <option value="__add">＋ Add a mode</option>
    </select>
  );
}
