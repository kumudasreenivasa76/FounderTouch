import Link from "next/link";
import PreviewLink from "@/components/preview-link";

/** Tab strip shown on every mode editor screen, so one mode's pieces feel like one editor. */
export default function ModeTabs({ mode, handle, active }: { mode: string; handle: string; active: "details" | "docs" | "actions" | "share" }) {
  const normal = mode === "NORMAL";
  const tabs = [
    { k: "details", label: "Details", href: normal ? "/app/profile/details" : `/app/profile/kit?mode=${mode}` },
    { k: "docs", label: normal ? "Contact & socials" : "Documents & links", href: normal ? "/app/profile/contact" : `/app/profile/kit?mode=${mode}&kind=DECK` },
    { k: "actions", label: "Actions & privacy", href: `/app/settings?mode=${mode}` },
    { k: "share", label: "Share · QR · NFC", href: `/app/card?mode=${mode}` },
  ] as const;
  return (
    <nav className="d-chips" style={{ margin: "0 0 12px" }} aria-label="Mode editor">
      {tabs.map((t) => <Link key={t.k} aria-current={t.k === active ? "page" : undefined} href={t.href} className={t.k === active ? "on" : ""}>{t.label}</Link>)}
      <Link href="/app/nfc">NFC</Link>
      <PreviewLink href={`/${handle}?mode=${mode}`} title="Page preview">Preview</PreviewLink>
    </nav>
  );
}
