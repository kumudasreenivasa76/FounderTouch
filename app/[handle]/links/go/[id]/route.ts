import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/** Counts a click on a link-page link, then sends the visitor on to it. */
export async function GET(_req: Request, { params }: { params: Promise<{ handle: string; id: string }> }) {
  const { handle, id } = await params;
  const link = await db.bioLink.findFirst({ where: { id, enabled: true, profile: { handle } } });
  if (!link || !/^https?:\/\//i.test(link.url)) return new NextResponse("Not found", { status: 404 });
  await db.bioLink.update({ where: { id: link.id }, data: { clicks: { increment: 1 } } });
  return NextResponse.redirect(link.url, 302);
}
