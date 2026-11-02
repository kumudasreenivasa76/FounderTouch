import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { checkPassword, startMobileSession } from "@/lib/auth";
import { body, fail, ok, str } from "@/lib/api";

/** Email and password in, a session token out. */
export async function POST(req: NextRequest) {
  const b = await body<{ email: string; password: string; device: string }>(req);
  const email = str(b.email).toLowerCase(), password = typeof b.password === "string" ? b.password : "";
  const u = await db.user.findUnique({ where: { email } });
  if (!u || !checkPassword(password, u.passwordHash)) return fail("bad_login", 401, "Wrong email or password.");
  if (u.status !== "ACTIVE") return fail("suspended", 403, "This account is paused. Contact the FounderTouch team to restore it.");
  const token = await startMobileSession(u.id, str(b.device, 80) || "Mobile app");
  return ok({ token });
}
