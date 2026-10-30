import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";

/** A candidate's uploaded resume. Only the recruiter who received the application can open it. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await currentUser();
  const a = await db.application.findUnique({ where: { id } });
  if (!u?.profile || !a || a.profileId !== u.profile.id || !a.resumeFile) return new NextResponse("Not found", { status: 404 });
  try {
    const buf = await readFile(path.join(process.cwd(), "uploads", path.basename(a.resumeFile)));
    return new NextResponse(buf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${encodeURIComponent(a.name)}-resume.pdf"`, "Cache-Control": "private, no-store" } });
  } catch {
    return new NextResponse("File missing", { status: 404 });
  }
}
