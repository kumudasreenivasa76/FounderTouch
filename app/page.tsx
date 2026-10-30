"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Splash() {
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(() => router.replace("/app"), 1800);
    return () => clearTimeout(t);
  }, [router]);
  return (
    <div className="screen center splash">
      <div className="logo">F</div>
      <h1>FounderTouch</h1>
      <p className="muted">Scan. Share. Follow up.</p>
    </div>
  );
}
