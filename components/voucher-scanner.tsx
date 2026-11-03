"use client";
import { useState } from "react";
import QrScanner from "./qr-scanner";
import type { CheckInResult } from "@/app/app/events/actions";
import type { RedeemResult } from "@/app/app/events/extra-actions";

/** Meal-voucher scanner: pick the meal, scan the ticket. Reuses the check-in camera; each scan carries an idempotency key. */
export default function VoucherScanner({ eventId, plans, redeem }: { eventId: string; plans: { id: string; name: string }[]; redeem: (eventId: string, planId: string, code: string, key: string) => Promise<RedeemResult> }) {
  const [plan, setPlan] = useState(plans[0]?.id ?? "");
  const check = async (id: string, code: string): Promise<CheckInResult> => {
    const r = await redeem(id, plan, code, crypto.randomUUID());
    return { status: r.status === "ok" ? "ok" : r.status === "already" ? "already" : r.status === "unknown" ? "unknown" : "error", name: r.name };
  };
  if (!plans.length) return <div className="card muted">No meals are set up for this event.</div>;
  return (
    <>
      <label className="f">Meal</label>
      <select value={plan} onChange={(e) => setPlan(e.target.value)}>{plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      <QrScanner key={plan} eventId={eventId} initialChecked={0} total={0} check={check} />
    </>
  );
}
