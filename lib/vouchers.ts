import { randomBytes } from "crypto";
import { db } from "./db";

/**
 * Redeems one meal for an attendee. Vouchers are created on demand up to the plan quota, then flipped
 * ISSUED -> REDEEMED with a conditional update, so two simultaneous scans cannot both succeed.
 * Returns whether this call won, and how many are left.
 */
export async function redeemOne(planId: string, attendeeId: string, by: string, now = new Date()) {
  const plan = await db.voucherPlan.findUniqueOrThrow({ where: { id: planId } });
  // Fixed slots 0..perPerson-1. The unique key makes a second concurrent creator fail harmlessly instead of over-issuing.
  for (let i = 0; i < plan.perPerson; i++) await db.voucher.create({ data: { planId, attendeeId, seq: i, token: randomBytes(12).toString("hex") } }).catch(() => {});
  const open = await db.voucher.findMany({ where: { planId, attendeeId, state: "ISSUED" }, select: { id: true } });
  let won = false;
  for (const v of open) {
    const r = await db.voucher.updateMany({ where: { id: v.id, state: "ISSUED" }, data: { state: "REDEEMED", redeemedAt: now, redeemedBy: by } });
    if (r.count === 1) { won = true; break; }
  }
  const left = await db.voucher.count({ where: { planId, attendeeId, state: "ISSUED" } });
  return { won, left };
}
