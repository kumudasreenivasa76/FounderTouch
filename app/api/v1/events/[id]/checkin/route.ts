import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { authed, body, fail, ok, str } from "@/lib/api";

/** Check someone in by the code on their ticket (the scanned QR or the bare token). */
export const POST = authed<{ id: string }>(async (req, { user, params }) => {
  const e = await db.event.findFirst({ where: { id: params.id, profileId: user.profile!.id } });
  if (!e) return fail("not_found", 404, "Event not found.");
  const token = str((await body<{ code: string }>(req)).code, 400).split(/[/?#]/).filter(Boolean).pop() ?? "";
  const a = token ? await db.attendee.findUnique({ where: { token } }) : null;
  if (!a || a.eventId !== e.id) return ok({ status: "unknown" });
  if (a.checkedInAt) return ok({ status: "already", name: a.name, company: a.company, at: a.checkedInAt });
  const now = new Date();
  await db.attendee.update({ where: { id: a.id }, data: { checkedInAt: now } });
  return ok({ status: "ok", name: a.name, company: a.company, at: now });
});
