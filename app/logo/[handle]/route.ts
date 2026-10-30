import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

/** A profile's company logo. Public, since it is shown on the public page. */
export async function GET(_: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const p = await db.profile.findUnique({ where: { handle } });
  if (!p?.logo) return new NextResponse("Not found", { status: 404 });
  try {
    const buf = await readFile(path.join(process.cwd(), "uploads", path.basename(p.logo)));
    return new NextResponse(buf, { headers: { "Content-Type": TYPES[path.extname(p.logo)] ?? "image/png", "Cache-Control": "public, max-age=300" } });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
