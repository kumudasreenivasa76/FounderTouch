import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { authed, ok } from "@/lib/api";
import { MODE_INFO, Mode } from "@/lib/modes";
import { statusLabel } from "@/lib/hiring";

/** People who shared details, access requests waiting on you, and recent applicants. */
export const GET = authed(async (_req, { user }) => {
  const pid = user.profile!.id;
  const [people, deck, mode, applicants] = await Promise.all([
    db.contact.findMany({ where: { profileId: pid }, orderBy: { createdAt: "desc" }, take: 200 }),
    db.deckRequest.findMany({ where: { profileId: pid, status: "PENDING" }, include: { resource: { select: { title: true } } }, orderBy: { createdAt: "desc" } }),
    db.modeRequest.findMany({ where: { profileId: pid, status: "PENDING" }, orderBy: { createdAt: "desc" } }),
    db.application.findMany({ where: { profileId: pid }, include: { job: { select: { title: true } } }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  const label = (m: string) => MODE_INFO[m as Mode]?.label ?? m;
  return ok({
    people: people.map((c) => ({ id: c.id, name: c.name, email: c.email, company: c.company, linkedin: c.linkedin, via: label(c.mode), at: c.createdAt })),
    requests: [
      ...deck.map((r) => ({ id: r.id, kind: "deck", name: r.name, email: r.email, what: r.resource.title, at: r.createdAt })),
      ...mode.map((r) => ({ id: r.id, kind: "mode", name: r.name, email: r.email, what: `${label(r.mode)} page`, note: r.note, at: r.createdAt })),
    ].sort((a, b) => +new Date(b.at) - +new Date(a.at)),
    applicants: applicants.map((a) => ({ id: a.id, name: a.name, email: a.email, job: a.job.title, status: a.status, statusLabel: statusLabel(a.status), at: a.createdAt })),
  });
});
