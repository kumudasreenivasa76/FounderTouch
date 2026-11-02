import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { authed, body, fail, ok } from "@/lib/api";
import { STATUSES } from "@/lib/hiring";

/** Move an applicant to another stage. */
export const PATCH = authed<{ id: string }>(async (req, { user, params }) => {
  const status = String((await body<{ status: string }>(req)).status ?? "");
  if (!STATUSES.some((s) => s.key === status)) return fail("status", 400, "Unknown stage.");
  const n = await db.application.updateMany({ where: { id: params.id, profileId: user.profile!.id }, data: { status } });
  return n.count ? ok({ ok: true }) : fail("not_found", 404, "Applicant not found.");
});
