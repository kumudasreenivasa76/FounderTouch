"use client";
import { useState } from "react";
import I from "@/components/icon";

export default function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); } catch { prompt("Copy this", text); }
    setDone(true); setTimeout(() => setDone(false), 1600);
  };
  return <button type="button" className="ghost" onClick={copy}>{done ? <><I n="check" /> Copied</> : label}</button>;
}
