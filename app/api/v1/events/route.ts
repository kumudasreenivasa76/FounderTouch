import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { authed, ok, originOf } from "@/lib/api";
import { themeOf } from "@/lib/look";

/** Events you run, soonest first. */
export const GET = authed(async (req, { user }) => {
  const p = user.profile!, origin = originOf(req), t = themeOf(p.theme);
  const rows = await db.event.findMany({ where: { profileId: p.id }, include: { _count: { select: { attendees: true, projects: true } } }, orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }] });
  const checked = await db.attendee.groupBy({ by: ["eventId"], where: { eventId: { in: rows.map((e) => e.id) }, checkedInAt: { not: null } }, _count: true });
  return ok({
    events: rows.map((e) => ({
      id: e.id, name: e.name, location: e.location, startsAt: e.startsAt, endsAt: e.endsAt, open: e.open, capacity: e.capacity,
      color: e.color1 || t.from, color2: e.color2 || e.color1 || t.to, pageUrl: `${origin}/e/${e.slug}`,
      registered: e._count.attendees, projects: e._count.projects, checkedIn: checked.find((c) => c.eventId === e.id)?._count ?? 0,
    })),
  });
});
