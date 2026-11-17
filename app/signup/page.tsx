import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { currentUser, hashPassword, startSession } from "@/lib/auth";
import Logo from "@/components/logo";
import SsoButtons from "@/components/sso-buttons";

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

export const metadata = { title: "Sign up" };
export default async function Signup({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await currentUser()) redirect("/app");
  const sp = await searchParams;
  return (
    <div role="main" id="main" className="screen center auth lux">
      <div className="auth-top">
        <div className="auth-hero">
          <Logo size={78} className="auth-logo" />
          <span className="auth-hi brand-word">Tap<span>Nodd</span></span>
        </div>
        <h1>Create your account</h1>
        <p className="sub">Your digital card, ready to share <b>in about a minute</b>.</p>
      </div>
      <form action={signup} className="kit-form">
        {sp.error && <div className="err">{MSG[sp.error] ?? "Something went wrong."}</div>}
        <div className="row"><input name="firstName" placeholder="First name" required autoComplete="given-name" /><input name="lastName" placeholder="Last name" required autoComplete="family-name" /></div>
        <input name="email" type="email" placeholder="Email" required autoComplete="email" />
        <input name="password" type="password" placeholder="Password (8+ characters)" required autoComplete="new-password" />
        <button>Continue</button>
      </form>
      <p className="auth-switch"><span>Already have an account?</span><Link href="/login">Log in<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></Link></p>
      <div className="or-div">or continue with</div>
      <SsoButtons />
    </div>
  );
}
