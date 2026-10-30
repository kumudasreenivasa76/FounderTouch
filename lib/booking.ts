export type BookingInfo = { provider: string; icon: string; embed: string | null };

const add = (url: URL, params: Record<string, string>) => {
  const u = new URL(url.toString());
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u.toString();
};

/**
 * Recognises a booking link and returns an embeddable URL when the provider allows it.
 * Works with any scheduler (unknown ones just get an "Open booking page" button).
 * `host` is this site's host, which Calendly wants as embed_domain.
 */
export function bookingInfo(raw: string, host: string): BookingInfo | null {
  let u: URL;
  try { u = new URL(raw); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  const h = u.hostname.replace(/^www\./, "");
  const is = (d: string) => h === d || h.endsWith("." + d);

  if (is("calendly.com")) return { provider: "Calendly", icon: "📅", embed: add(u, { embed_domain: host.split(":")[0], embed_type: "Inline", hide_gdpr_banner: "1" }) };
  if (is("cal.com")) return { provider: "Cal.com", icon: "🗓️", embed: add(u, { embed: "true" }) };
  if (h === "calendar.google.com") return { provider: "Google Calendar", icon: "📆", embed: u.pathname.includes("/appointments/") ? add(u, { gv: "true" }) : null };
  if (is("outlook.office365.com") || is("outlook.office.com") || is("bookings.microsoft.com")) return { provider: "Microsoft Bookings", icon: "🟦", embed: raw };
  if (is("savvycal.com")) return { provider: "SavvyCal", icon: "📅", embed: raw };
  if (is("tidycal.com")) return { provider: "TidyCal", icon: "📅", embed: raw };
  if (is("youcanbook.me")) return { provider: "YouCanBookMe", icon: "📅", embed: raw };
  if (is("acuityscheduling.com")) return { provider: "Acuity", icon: "📅", embed: raw };
  if (is("zohobookings.com") || is("zohobookings.in")) return { provider: "Zoho Bookings", icon: "📅", embed: raw };
  if (is("hubspot.com")) return { provider: "HubSpot Meetings", icon: "📅", embed: add(u, { embed: "true" }) };
  if (is("zoom.us")) return { provider: "Zoom Scheduler", icon: "🎥", embed: null };
  if (h === "meet.google.com") return { provider: "Google Meet", icon: "🎥", embed: null };
  if (is("koalendar.com")) return { provider: "Koalendar", icon: "📅", embed: raw };
  return { provider: h, icon: "🔗", embed: null };
}
