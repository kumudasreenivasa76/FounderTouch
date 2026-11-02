import { NextRequest, NextResponse } from "next/server";

/** Invite links look like /join/<token>; they open the sign-up form with the invite attached. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return NextResponse.redirect(new URL(`/signup?invite=${encodeURIComponent(token)}`, req.url));
}
