import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { authed, ok } from "@/lib/api";

/** Remove a saved card. */
export const DELETE = authed<{ id: string }>(async (_req, { user, params }) => {
  await db.savedCard.deleteMany({ where: { id: params.id, userId: user.id } });
  return ok({ ok: true });
});
