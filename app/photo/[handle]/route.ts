import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUpload } from "@/lib/storage";

const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

export async function GET(_: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const p = await db.profile.findUnique({ where: { handle } });
  if (!p?.photo) return new NextResponse("Not found", { status: 404 });
  try {
    const buf = await getUpload(p.photo);
    return new NextResponse(buf, { headers: { "Content-Type": TYPES[path.extname(p.photo)] ?? "image/jpeg", "Cache-Control": "no-cache" } });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
