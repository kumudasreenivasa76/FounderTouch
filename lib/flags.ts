/** Feature flags from FLAGS="a,b" in .env. Everything defaults to on; list a name with a leading "-" to turn it off (e.g. FLAGS=-event_vouchers). */
export type Flag = "nfc_switchable_target" | "connections_v2" | "events_modules" | "event_vouchers" | "event_recruiting_bridge" | "transactional_email";

export function flag(name: Flag): boolean {
  const list = (process.env.FLAGS ?? "").split(",").map((s) => s.trim());
  return !list.includes("-" + name);
}
