import { NextRequest } from "next/server";
import { startMobileSession } from "@/lib/auth";
import { REGISTER_MSG, registerUser } from "@/lib/accounts";
import { body, fail, ok, str } from "@/lib/api";

/** Creates an account (optionally from an invite) and signs it in. */
export async function POST(req: NextRequest) {
  const b = await body<{ firstName: string; lastName: string; email: string; password: string; invite: string; device: string }>(req);
  const r = await registerUser({ firstName: str(b.firstName, 60), lastName: str(b.lastName, 60), email: str(b.email, 200), password: typeof b.password === "string" ? b.password : "", invite: str(b.invite, 100) || undefined });
  if (!r.ok) return fail(r.error, r.error === "exists" ? 409 : 400, REGISTER_MSG[r.error]);
  const token = await startMobileSession(r.userId, str(b.device, 80) || "Mobile app");
  return ok({ token, hasProfile: r.hasProfile }, 201);
}
