import { createHmac } from "crypto";
import { db } from "./db";
import { safeHttpsUrl } from "./safe-url";

export const EVENTS = ["contact.created", "contact.accepted", "event.registered"] as const;
export type IntegrationEvent = (typeof EVENTS)[number];

const LABEL: Record<string, string> = { "contact.created": "New contact request", "contact.accepted": "Connection accepted", "event.registered": "New event registration" };

/** Sends one event to a single integration. Never throws; the result is logged on the integration. */
export async function deliver(integ: { id: string; kind: string; url: string; secret: string }, event: string, data: Record<string, unknown>) {
  let ok = false, detail = "";
  try {
    const url = await safeHttpsUrl(integ.url);
    if (!url) throw new Error("Address is not allowed (must be a public https URL)");
    const payload = integ.kind === "SLACK"
      ? { text: `*${LABEL[event] ?? event}*\n${Object.entries(data).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n")}` }
      : { event, createdAt: new Date().toISOString(), source: "tapnodd", data };
    const body = JSON.stringify(payload);
    const headers: Record<string, string> = { "Content-Type": "application/json", "User-Agent": "TapNodd-Webhook/1", "X-TapNodd-Event": event };
    if (integ.secret) headers["X-TapNodd-Signature"] = "sha256=" + createHmac("sha256", integ.secret).update(body).digest("hex");
    // No redirects: a public address must not bounce us to an internal one.
    const r = await fetch(url, { method: "POST", headers, body, redirect: "manual", signal: AbortSignal.timeout(5000) });
    ok = r.status >= 200 && r.status < 300;
    detail = `HTTP ${r.status}`;
  } catch (e) {
    detail = String(e instanceof Error ? e.message : e).slice(0, 160);
  }
  await db.integrationDelivery.create({ data: { integrationId: integ.id, event, ok, detail } }).catch(() => {});
  await db.integration.update({ where: { id: integ.id }, data: { lastStatus: ok ? "ok" : detail, lastAt: new Date() } }).catch(() => {});
  return { ok, detail };
}

/** Tells every enabled integration of this profile about an event. Fire and forget: a slow receiver never blocks the visitor. */
export function emit(profileId: string, event: IntegrationEvent, data: Record<string, unknown>) {
  void (async () => {
    const prof = await db.profile.findUnique({ where: { id: profileId }, select: { userId: true } });
    const mem = prof?.userId ? await db.orgMember.findUnique({ where: { userId: prof.userId } }) : null;
    const list = await db.integration.findMany({ where: { enabled: true, OR: [{ profileId }, ...(mem ? [{ orgId: mem.orgId }] : [])] } });
    await Promise.all(list.filter((i) => i.events.split(",").includes(event)).map((i) => deliver(i, event, data)));
  })().catch(() => {});
}
