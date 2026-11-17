"use client";
import { useEffect } from "react";

/** Marks the page when it is shown inside another page (the dashboard workspace or a preview panel), so it can drop its own navigation. */
export default function EmbedFlag() {
  useEffect(() => {
    try { if (window.self !== window.top) document.documentElement.classList.add("embedded"); } catch { document.documentElement.classList.add("embedded"); }
  }, []);
  return null;
}
