import { NextRequest, NextResponse } from "next/server";
import { userForToken } from "./auth";

/** JSON response for the mobile API. */
export const ok = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const fail = (error: string, status = 400, message?: string) => NextResponse.json({ error, message: message ?? error }, { status });

/** Public base URL for links and QR codes: PUBLIC_URL when set, else the address the request came in on. */
export function originOf(req: NextRequest) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost";
  return `${req.headers.get("x-forwarded-proto") ?? "http"}://${host}`;
}

/** The signed-in user (with profile) behind the bearer token, or null. */
export async function apiUser(req: NextRequest) {
  const m = /^Bearer\s+([a-f0-9]{32,})$/i.exec(req.headers.get("authorization") ?? "");
  return m ? userForToken(m[1]) : null;
}

type Handler<P> = (req: NextRequest, ctx: { user: NonNullable<Awaited<ReturnType<typeof apiUser>>>; params: P }) => Promise<Response>;

/** Wraps a route: 401 without a valid token, 409 when the profile is not set up yet (unless allowed). */
export function authed<P = Record<string, string>>(fn: Handler<P>, opts: { needsProfile?: boolean } = { needsProfile: true }) {
  return async (req: NextRequest, ctx: { params: Promise<P> }) => {
    const user = await apiUser(req);
    if (!user) return fail("unauthorized", 401, "Please log in again.");
    if (opts.needsProfile !== false && !user.profile) return fail("no_profile", 409, "Finish setting up your card first.");
    try {
      return await fn(req, { user, params: await ctx.params });
    } catch (e) {
      console.error("[api]", req.method, req.nextUrl.pathname, e);
      return fail("server_error", 500, "Something went wrong. Try again.");
    }
  };
}

export async function body<T = Record<string, unknown>>(req: NextRequest): Promise<Partial<T>> {
  try { return (await req.json()) as Partial<T>; } catch { return {}; }
}
export const str = (v: unknown, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");
