import { NextRequest, NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { SSO, isProvider, userFromCode, type Provider } from "@/lib/sso";

/** Finishes social sign-in: verifies state, swaps the code for the account, finds or creates the user. */
async function handle(req: NextRequest, provider: Provider, params: URLSearchParams) {
  const origin = req.nextUrl.origin;
  const fail = (code: string) => {
    const r = NextResponse.redirect(`${origin}/login?error=${code}`, 303);
    r.cookies.delete("sso_state"); r.cookies.delete("sso_next");
    return r;
  };
  if (!SSO[provider].configured()) return fail(provider);
  const code = params.get("code"), state = params.get("state");
  if (!code || !state || state !== req.cookies.get("sso_state")?.value) return fail("ssofail");

  const g = await userFromCode(provider, origin, code);
  if (!g || !g.emailVerified) return fail("ssofail");

  // Apple sends the name only on the very first sign-in, as a form field.
  if (provider === "apple" && !g.givenName) {
    try {
      const u = JSON.parse(params.get("user") ?? "") as { name?: { firstName?: string; lastName?: string } };
      g.givenName = u.name?.firstName ?? ""; g.familyName = u.name?.lastName ?? "";
      if (g.givenName) g.name = `${g.givenName} ${g.familyName}`.trim();
    } catch { /* no name sent */ }
  }

  const column = SSO[provider].column;
  let user = await db.user.findFirst({ where: { [column]: g.sub } });
  if (!user) {
    const byEmail = await db.user.findUnique({ where: { email: g.email } });
    user = byEmail
      ? await db.user.update({ where: { id: byEmail.id }, data: { [column]: g.sub } }) // link this provider to the existing account
      : await db.user.create({
          data: {
            email: g.email, [column]: g.sub, name: g.name,
            firstName: g.givenName, lastName: g.familyName,
            passwordHash: hashPassword(randomBytes(24).toString("hex")), // no password; they use the provider
          },
        });
  }

  const token = randomBytes(24).toString("hex");
  await db.session.create({ data: { token, userId: user.id } });
  const next = req.cookies.get("sso_next")?.value ?? "";
  const profile = await db.profile.findUnique({ where: { userId: user.id }, select: { id: true } });
  const dest = profile ? (next.startsWith("/") && !next.startsWith("//") ? next : "/app") : "/onboarding";
  const res = NextResponse.redirect(`${origin}${dest}`, 303);
  res.cookies.set("sid", token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  res.cookies.delete("sso_state"); res.cookies.delete("sso_next");
  return res;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  if (!isProvider(provider)) notFound();
  return handle(req, provider, req.nextUrl.searchParams);
}

/** Apple returns the code as a form POST (response_mode=form_post). */
export async function POST(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  if (!isProvider(provider)) notFound();
  const fd = await req.formData();
  const params = new URLSearchParams();
  fd.forEach((v, k) => { if (typeof v === "string") params.set(k, v); });
  return handle(req, provider, params);
}
