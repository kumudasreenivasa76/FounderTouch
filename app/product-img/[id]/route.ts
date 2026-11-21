import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUpload } from "@/lib/storage";

const TYPES: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };

/** A Seller's product photo. Catalog items are public, like the page that lists them. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const x = await db.product.findUnique({ where: { id } });
  if (!x?.image) return new NextResponse("Not found", { status: 404 });
  try {
    const buf = await getUpload(x.image);
    return new NextResponse(buf, { headers: { "Content-Type": TYPES[path.extname(x.image).toLowerCase()] ?? "application/octet-stream", "Cache-Control": "public, max-age=3600" } });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
