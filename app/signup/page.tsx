import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { currentUser, hashPassword, startSession } from "@/lib/auth";

async function signup(fd: FormData) {
  "use server";
  const firstName = String(fd.get("firstName")).trim(), lastName = String(fd.get("lastName")).trim(), name = `${firstName} ${lastName}`.trim(), email = String(fd.get("email")).trim().toLowerCase(), pw = String(fd.get("password"));
  if (!firstName || !lastName || !/^\S+@\S+\.\S+$/.test(email)) redirect("/signup?error=details");
  if (pw.length < 8) redirect("/signup?error=password");
  if (await db.user.findUnique({ where: { email } })) redirect("/signup?error=exists");
  const u = await db.user.create({ data: { name, firstName, lastName, email, passwordHash: hashPassword(pw) } });
  await startSession(u.id);
  redirect("/onboarding");
}

const MSG: Record<string, string> = {
  details: "Enter your first name, last name and a valid email.",
  password: "Password must be at least 8 characters.",
  exists: "That email already has an account. Log in instead.",
};

export default async function Signup({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await currentUser()) redirect("/app");
  const sp = await searchParams;
  return (
    <div className="screen center">
      <div className="logo">F</div>
      <h1 style={{ textAlign: "center" }}>Create your account</h1>
      <p className="muted" style={{ textAlign: "center" }}>Takes under a minute</p>
      {sp.error && <div className="err">{MSG[sp.error] ?? "Something went wrong."}</div>}
      <form action={signup}>
        <div className="row"><input name="firstName" placeholder="First name" required autoComplete="given-name" /><input name="lastName" placeholder="Last name" required autoComplete="family-name" /></div>
        <input name="email" type="email" placeholder="Email" required autoComplete="email" />
        <input name="password" type="password" placeholder="Password (8+ characters)" required autoComplete="new-password" />
        <button>Continue</button>
      </form>
      <p className="muted" style={{ textAlign: "center", marginTop: 16 }}>Have an account? <Link href="/login">Log in</Link></p>
    </div>
  );
}
