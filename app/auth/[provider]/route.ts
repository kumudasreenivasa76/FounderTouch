import { NextRequest, NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { randomBytes } from "crypto";
import { SSO, authUrl, isProvider } from "@/lib/sso";

/** Starts social sign-in: remembers a state cookie and sends the visitor to the provider. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  if (!isProvider(provider)) notFound();
  const origin = req.nextUrl.origin;
  if (!SSO[provider].configured()) return NextResponse.redirect(`${origin}/login?error=${provider}`);

  const next = req.nextUrl.searchParams.get("next") ?? "";
  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(authUrl(provider, origin, state));
  // Apple posts the code back cross-site, which a Lax cookie would not survive.
  const cross = provider === "apple" && origin.startsWith("https");
  const opts = { httpOnly: true, path: "/", maxAge: 600, sameSite: cross ? ("none" as const) : ("lax" as const), secure: cross || undefined };
  res.cookies.set("sso_state", state, opts);
  if (next.startsWith("/") && !next.startsWith("//")) res.cookies.set("sso_next", next, opts);
  return res;
}
