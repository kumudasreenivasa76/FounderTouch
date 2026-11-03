import Link from "next/link";

/** Tab strip shown on every mode editor screen, so one mode's pieces feel like one editor. */
export default function ModeTabs({ mode, handle, active }: { mode: string; handle: string; active: "details" | "docs" | "actions" | "share" }) {
  const hire = mode === "HIRE";
  const tabs = [
    { k: "details", label: "Details", href: hire ? "/app/profile/work" : `/app/profile/kit?mode=${mode}` },
    { k: "docs", label: "Documents & links", href: hire ? "/app/profile/work" : `/app/profile/kit?mode=${mode}&kind=DECK` },
    { k: "actions", label: "Actions & privacy", href: `/app/settings?mode=${mode}` },
    { k: "share", label: "Share · QR · NFC", href: `/app/card?mode=${mode}` },
  ] as const;
  return (
    <nav className="chips" style={{ margin: "0 0 12px", overflowX: "auto", flexWrap: "nowrap" }} aria-label="Mode editor">
      {tabs.map((t) => <Link key={t.k} aria-current={t.k === active ? "page" : undefined} href={t.href} className={"pill" + (t.k === active ? " on" : "")} style={{ padding: "6px 14px", whiteSpace: "nowrap" }}>{t.label}</Link>)}
      <Link href="/app/nfc" className="pill" style={{ padding: "6px 14px", whiteSpace: "nowrap" }}>NFC</Link>
      <a href={`/${handle}?mode=${mode}`} target="_blank" rel="noopener noreferrer" className="pill" style={{ padding: "6px 14px", whiteSpace: "nowrap" }}>Preview</a>
    </nav>
  );
}
