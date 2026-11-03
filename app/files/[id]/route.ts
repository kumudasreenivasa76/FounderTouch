import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { db, ACCESS_DAYS } from "@/lib/db";
import { getUpload } from "@/lib/storage";



export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await db.resource.findUnique({ where: { id } });
  if (!r) return new NextResponse("Not found", { status: 404 });

  if (r.expiresAt && r.expiresAt.getTime() < Date.now()) return new NextResponse("This file has expired.", { status: 410 });

  if (r.gated) {
    const t = req.nextUrl.searchParams.get("t") ?? "";
    const dr = t ? await db.deckRequest.findUnique({ where: { token: t } }) : null;
    const ok = dr && dr.resourceId === r.id && dr.status === "APPROVED" && dr.decidedAt && Date.now() - dr.decidedAt.getTime() < ACCESS_DAYS * 86400_000;
    if (!ok) return new NextResponse("This file needs the owner's approval, or your access link has expired.", { status: 403 });
  }

  if (!r.filePath) return r.url ? NextResponse.redirect(r.url) : new NextResponse("Not found", { status: 404 });
  try {
    const buf = await getUpload(r.filePath);
    return new NextResponse(buf, {
      headers: {
        "Content-Type": r.mime || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(r.title)}${path.extname(r.filePath)}"`,
        "Cache-Control": r.gated ? "private, no-store" : "public, max-age=60",
      },
    });
  } catch {
    return new NextResponse("File missing", { status: 404 });
  }
}
