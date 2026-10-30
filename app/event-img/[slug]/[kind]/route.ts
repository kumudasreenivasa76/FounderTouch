import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

/** An event's logo or cover image. Public, since the event page is public. */
export async function GET(_: Request, { params }: { params: Promise<{ slug: string; kind: string }> }) {
  const { slug, kind } = await params;
  if (kind !== "logo" && kind !== "cover") return new NextResponse("Not found", { status: 404 });
  const e = await db.event.findUnique({ where: { slug } });
  const file = e?.[kind];
  if (!file) return new NextResponse("Not found", { status: 404 });
  try {
    const buf = await readFile(path.join(process.cwd(), "uploads", path.basename(file)));
    return new NextResponse(buf, { headers: { "Content-Type": TYPES[path.extname(file)] ?? "image/jpeg", "Cache-Control": "no-cache" } });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
