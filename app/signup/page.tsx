import { redirect } from "next/navigation";
import Link from "next/link";
import I from "@/components/icon";
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
    <div className="screen auth">
      <div className="wordmark"><span className="logo">ft</span>FounderTouch</div>
      <h1>Create your account</h1>
      <p className="muted">One card for every room you walk into. Takes under a minute.</p>
      {sp.error && <div className="err"><I n="alert" size={16} /> {MSG[sp.error] ?? "Something went wrong."}</div>}
      <form action={signup}>
        <div className="row">
          <div><label className="f" htmlFor="fn">First name</label><input id="fn" name="firstName" required autoComplete="given-name" /></div>
          <div><label className="f" htmlFor="ln">Last name</label><input id="ln" name="lastName" required autoComplete="family-name" /></div>
        </div>
        <label className="f" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" placeholder="you@company.com" required autoComplete="email" />
        <label className="f" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" placeholder="At least 8 characters" required autoComplete="new-password" />
        <button style={{ marginTop: 8 }}>Continue</button>
      </form>
      <p className="muted" style={{ marginTop: 18 }}>Have an account? <Link href="/login">Log in</Link></p>
    </div>
  );
}
