"use client";
import { useEffect, useState, type ReactNode } from "react";

type Tab = "details" | "docs" | "actions" | "share" | "brand";

/** The kit editor's tabs. Details, documents and privacy all switch right here, with no page change. */
export default function KitPanels({ mode, handle, initial, details, docs, actions, share, brand }: {
  mode: string; handle: string; initial: Tab; details: ReactNode; docs: ReactNode; actions: ReactNode; share: ReactNode; brand: ReactNode;
}) {
  const [tab, setTab] = useState<Tab>(initial);
  useEffect(() => {
    const on = (e: Event) => { const d = (e as CustomEvent<{ mode: string; tab: Tab }>).detail; if (d.mode === mode) setTab(d.tab); };
    window.addEventListener("kit-tab", on);
    return () => window.removeEventListener("kit-tab", on);
  }, [mode]);
  const tabs: [Tab, string][] = [["details", "Details"], ["docs", "Documents & links"], ["actions", "Actions & privacy"], ["share", "Share · QR · NFC"], ["brand", "Logo & colours"]];
  const pill = { padding: "6px 14px", whiteSpace: "nowrap" as const };
  return (
    <>
      <nav className="chips kit-tabs" style={{ margin: "0 0 14px", overflowX: "auto", flexWrap: "nowrap" }} aria-label="Mode editor">
        {tabs.map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)} aria-current={tab === k ? "page" : undefined}
            className={"pill" + (tab === k ? " on" : "")} style={{ ...pill, width: "auto", border: 0, cursor: "pointer", fontWeight: 400 }}>{label}</button>
        ))}
        <a href={`/${handle}?mode=${mode}`} target="_blank" rel="noopener noreferrer" className="pill" style={pill}>Preview</a>
      </nav>
      <div hidden={tab !== "details"}>{details}</div>
      <div hidden={tab !== "docs"}>{docs}</div>
      <div hidden={tab !== "actions"}>{actions}</div>
      <div hidden={tab !== "share"}>{share}</div>
      <div hidden={tab !== "brand"}>{brand}</div>
    </>
  );
}
