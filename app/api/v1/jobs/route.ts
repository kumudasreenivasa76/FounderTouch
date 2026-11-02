import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { authed, ok } from "@/lib/api";

/** Roles you posted, with applicant counts by stage. */
export const GET = authed(async (_req, { user }) => {
  const jobs = await db.job.findMany({ where: { profileId: user.profile!.id }, include: { applications: { select: { status: true } } }, orderBy: { createdAt: "desc" } });
  return ok({
    jobs: jobs.map((j) => ({
      id: j.id, title: j.title, location: j.location, workType: j.workType, open: j.open,
      counts: j.applications.reduce<Record<string, number>>((m, a) => ({ ...m, [a.status]: (m[a.status] ?? 0) + 1 }), {}),
      total: j.applications.length,
    })),
  });
});
