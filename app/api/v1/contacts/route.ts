import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/** Your connected contacts as JSON. Authenticate with `Authorization: Bearer <your API key>`. Read only. */
export async function GET(req: NextRequest) {
  const key = /^Bearer\s+(ft_[a-f0-9]{48})$/.exec(req.headers.get("authorization") ?? "")?.[1];
  const nope = () => NextResponse.json({ error: "Invalid or missing API key" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  if (!key) return nope();
  const token = await db.apiToken.findUnique({ where: { tokenHash: createHash("sha256").update(key).digest("hex") } });
  if (!token) return nope();
  await db.apiToken.update({ where: { id: token.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  const limit = Math.min(500, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") ?? "100", 10) || 100));
  const rows = await db.contact.findMany({ where: { profileId: token.profileId, status: "CONNECTED" }, orderBy: { createdAt: "desc" }, take: limit });
  return NextResponse.json(
    { data: rows.map((c) => ({ id: c.id, name: c.name, email: c.email, company: c.company, mode: c.mode, source: c.source, tags: c.tags.split(",").filter(Boolean), notes: c.notes, followUpAt: c.followUpAt, createdAt: c.createdAt })) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
