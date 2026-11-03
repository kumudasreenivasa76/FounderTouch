import Link from "next/link";
import OfflineCard from "@/components/offline-card";

/** Shown when a page cannot be loaded without a connection. Public: it only reads what this device saved. */
export const metadata = { title: "Offline" };
export default function Offline() {
  return (
    <div role="main" id="main" className="screen">
      <h1>You are offline</h1>
      <p className="muted">This page needs a connection. Your card is saved on this device, so you can still share it.</p>
      <OfflineCard />
      <Link href="/app" className="btn ghost" style={{ marginTop: 12 }}>Try again</Link>
    </div>
  );
}
