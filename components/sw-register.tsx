"use client";
import { useEffect } from "react";

/** Registers the service worker in production builds only (in dev it would serve stale code). */
export default function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}

/** Used on the login page: a signed-out device keeps no cached private pages or offline card. */
export function ClearOfflineData() {
  useEffect(() => {
    try { localStorage.removeItem("ft_card"); localStorage.removeItem("ft_scan_queue"); } catch { /* ignore */ }
    navigator.serviceWorker?.controller?.postMessage("clear");
  }, []);
  return null;
}
