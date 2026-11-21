import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { currentUser, hashPassword, startSession } from "@/lib/auth";
import { issueCode } from "@/lib/verify";
import AuthTop, { IconField } from "@/components/auth-top";
import SsoButtons from "@/components/sso-buttons";

async function signup(fd: FormData) {
  "use server";
  const firstName = String(fd.get("firstName")).trim(), lastName = String(fd.get("lastName")).trim(), name = `${firstName} ${lastName}`.trim(), email = String(fd.get("email")).trim().toLowerCase(), pw = String(fd.get("password"));
  if (!firstName || !lastName || !/^\S+@\S+\.\S+$/.test(email)) redirect("/signup?error=details");
  if (pw.length < 8) redirect("/signup?error=password");
  if (await db.user.findUnique({ where: { email } })) redirect("/signup?error=exists");
  const u = await db.user.create({ data: { name, firstName, lastName, email, passwordHash: hashPassword(pw), emailVerified: false } });
  await startSession(u.id);
  await issueCode(u.id, email);
  redirect("/verify");
}

const MSG: Record<string, string> = {
  details: "Enter your first name, last name and a valid email.",
  password: "Password must be at least 8 characters.",
  exists: "That email already has an account. Log in instead.",
};

const ICONUSER = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>;
const ICONMAIL = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>;
const ICONLOCK = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>;

export const metadata = { title: "Sign up" };
export default async function Signup({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await currentUser()) redirect("/app");
  const sp = await searchParams;
  return (
    <div role="main" id="main" className="screen center auth d-auth">
      <AuthTop title="Create Your Account" on="signup" />
      <form action={signup} className="kit-form">
        {sp.error && <div className="err">{MSG[sp.error] ?? "Something went wrong."}</div>}
        <div className="d-two">
          <IconField icon={ICONUSER}><span className="sr-only">First name</span><input name="firstName" placeholder="First Name" required autoComplete="given-name" /></IconField>
          <IconField icon={ICONUSER}><span className="sr-only">Last name</span><input name="lastName" placeholder="Last Name" required autoComplete="family-name" /></IconField>
        </div>
        <IconField icon={ICONMAIL}><span className="sr-only">Email address</span><input name="email" type="email" placeholder="Email Address" required autoComplete="email" /></IconField>
        <IconField icon={ICONLOCK}><span className="sr-only">Password, 8 or more characters</span><input name="password" type="password" placeholder="Password (8+ characters)" required autoComplete="new-password" /></IconField>
        <button>Create Account</button>
      </form>
      <div className="d-or">or continue with</div>
      <SsoButtons />
    </div>
  );
}
