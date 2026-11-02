import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { authed, body, fail, ok } from "@/lib/api";

/** Approve or decline someone asking to see a gated deck or page. */
export const POST = authed<{ id: string }>(async (req, { user, params }) => {
  const b = await body<{ kind: string; status: string }>(req);
  if (b.status !== "APPROVED" && b.status !== "DECLINED") return fail("status", 400, "Choose approve or decline.");
  const where = { id: params.id, profileId: user.profile!.id, status: "PENDING" };
  const data = { status: b.status, decidedAt: new Date() };
  const n = b.kind === "mode" ? await db.modeRequest.updateMany({ where, data }) : await db.deckRequest.updateMany({ where, data });
  return n.count ? ok({ ok: true }) : fail("not_found", 404, "That request was already handled.");
});
