import { db } from "./db";
import { flag } from "./flags";

/**
 * Sends a transactional email once per (trigger, recipient, ref). Retries and double submits are no-ops.
 * With RESEND_API_KEY and MAIL_FROM set it sends through Resend; otherwise it records the message as LOGGED
 * so the owner can see what would have gone out.
 */
export async function notify(trigger: string, recipient: string, ref: string, subject: string, body: string) {
  if (!flag("transactional_email")) return "off" as const;
  let row;
  try {
    row = await db.notificationDelivery.create({ data: { trigger, recipient, ref, subject } });
  } catch {
    return "duplicate" as const; // unique key hit: already handled
  }
  const key = process.env.RESEND_API_KEY, from = process.env.MAIL_FROM;
  if (!key || !from) {
    await db.notificationDelivery.update({ where: { id: row.id }, data: { state: "LOGGED" } });
    return "logged" as const;
  }
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: recipient, subject, text: body }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    await db.notificationDelivery.update({ where: { id: row.id }, data: { state: "SENT" } });
    return "sent" as const;
  } catch (e) {
    await db.notificationDelivery.update({ where: { id: row.id }, data: { state: "FAILED", error: String(e).slice(0, 200) } });
    return "failed" as const;
  }
}
