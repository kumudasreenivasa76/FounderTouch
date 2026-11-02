import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { authed, fail, ok, originOf } from "@/lib/api";

/** One event with its attendee list. */
export const GET = authed<{ id: string }>(async (req, { user, params }) => {
  const e = await db.event.findFirst({ where: { id: params.id, profileId: user.profile!.id }, include: { attendees: { orderBy: { createdAt: "desc" } } } });
  if (!e) return fail("not_found", 404, "Event not found.");
  return ok({
    id: e.id, name: e.name, location: e.location, startsAt: e.startsAt, open: e.open, capacity: e.capacity, pageUrl: `${originOf(req)}/e/${e.slug}`,
    attendees: e.attendees.map((a) => ({ id: a.id, name: a.name, email: a.email, company: a.company, checkedInAt: a.checkedInAt })),
  });
});
