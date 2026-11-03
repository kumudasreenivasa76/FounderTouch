"use client";
import { useCallback, useEffect, useState } from "react";
import type { Found } from "@/app/app/tap-actions";

const KEY = "ft_scan_queue";
const read = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; } };

/** Adds a scan to the offline queue. Called by the scanner when there is no connection. */
export function queueScan(raw: string) {
  const q = read();
  if (!q.includes(raw)) localStorage.setItem(KEY, JSON.stringify([...q, raw].slice(-50)));
}

/** Shows an offline banner and, when the connection returns, looks up and saves every scan made offline. */
export default function OfflineSync({ peek, save }: { peek: (raw: string) => Promise<Found>; save: (handle: string, mode: string) => Promise<{ ok: boolean; own?: boolean }> }) {
  const [online, setOnline] = useState(true);
  const [waiting, setWaiting] = useState(0);
  const [note, setNote] = useState("");

  const flush = useCallback(async () => {
    const q = read();
    if (!q.length) { setWaiting(0); return; }
    const left: string[] = [];
    let added = 0;
    for (const raw of q) {
      try {
        const f = await peek(raw);
        if (f.ok && !f.own) { const r = await save(f.handle, f.mode); if (r.ok) added++; else left.push(raw); }
      } catch { left.push(raw); }
    }
    localStorage.setItem(KEY, JSON.stringify(left));
    setWaiting(left.length);
    if (added) setNote(`${added} card${added === 1 ? "" : "s"} you scanned offline ${added === 1 ? "was" : "were"} saved to your wallet.`);
  }, [peek, save]);

  useEffect(() => {
    setOnline(navigator.onLine); setWaiting(read().length);
    const up = () => { setOnline(true); void flush(); }, down = () => setOnline(false);
    window.addEventListener("online", up); window.addEventListener("offline", down);
    if (navigator.onLine) void flush();
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, [flush]);

  if (online && !note) return null;
  return (
    <div role="region" aria-label="Connection status" style={{ position: "sticky", top: 0, zIndex: 40, padding: "8px 14px", fontSize: 13, background: online ? "#e6f9ef" : "#fff4e0", color: "#1c2330", textAlign: "center" }}>
      <span role="status">{online ? note : `You are offline. Your card is still available${waiting ? `, and ${waiting} scan${waiting === 1 ? "" : "s"} will sync when you are back online` : ""}. `}</span>
      {!online && <a href="/offline" style={{ textDecoration: "underline" }}>Open offline card</a>}
    </div>
  );
}
