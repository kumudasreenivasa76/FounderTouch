import { createHash, randomInt } from "crypto";
import { cookies } from "next/headers";
import { db } from "./db";
import { notify } from "./notify";

const hash = (c: string) => createHash("sha256").update(c).digest("hex");
export const CODE_MINUTES = 15;

/**
 * Makes a fresh 6-digit code, stores its hash and emails it. When this server cannot send email
 * (no Resend key), the code is kept in a short-lived cookie so the screen can show it instead.
 */
export async function issueCode(userId: string, email: string) {
  // VERIFY_FIXED_CODE (local testing only, set in .env.local) makes every code the same, e.g. 123456.
  const fixed = (process.env.VERIFY_FIXED_CODE ?? "").replace(/\D/g, "");
  const code = fixed.length === 6 ? fixed : String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.user.update({ where: { id: userId }, data: { verifyCode: hash(code), verifyExpires: new Date(Date.now() + CODE_MINUTES * 60_000) } });
  const r = await notify("verify_email", email, `${userId}:${Date.now()}`, `Your TapNodd code: ${code}`,
    `Your TapNodd verification code is ${code}.\n\nIt expires in ${CODE_MINUTES} minutes. If you did not sign up, ignore this email.`);
  const jar = await cookies();
  if (r === "sent") jar.set("vhint", "", { path: "/verify", maxAge: 0 });
  else jar.set("vhint", code, { httpOnly: true, sameSite: "lax", path: "/verify", maxAge: CODE_MINUTES * 60 });
  return r;
}

export async function checkCode(userId: string, code: string) {
  const u = await db.user.findUnique({ where: { id: userId } });
  if (!u || !u.verifyCode || !u.verifyExpires || u.verifyExpires.getTime() < Date.now()) return "expired" as const;
  if (hash(code.replace(/\D/g, "")) !== u.verifyCode) return "wrong" as const;
  await db.user.update({ where: { id: userId }, data: { emailVerified: true, verifyCode: "", verifyExpires: null } });
  (await cookies()).set("vhint", "", { path: "/verify", maxAge: 0 });
  return "ok" as const;
}
