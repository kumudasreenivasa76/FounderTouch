import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok } from "@/lib/api";

/** Ends this device's session. Always succeeds. */
export async function POST(req: NextRequest) {
  const m = /^Bearer\s+([a-f0-9]{32,})$/i.exec(req.headers.get("authorization") ?? "");
  if (m) await db.session.deleteMany({ where: { token: m[1] } });
  return ok({ ok: true });
}
