import { ClearOfflineData } from "@/components/sw-register";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { checkPassword, currentUser, startSession } from "@/lib/auth";
import AuthTop, { IconField } from "@/components/auth-top";
import SsoButtons from "@/components/sso-buttons";

async function login(fd: FormData) {
  "use server";
  const email = String(fd.get("email")).trim().toLowerCase();
  const u = await db.user.findUnique({ where: { email } });
  const next = String(fd.get("next") ?? "");
  const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/app";
  if (!u || !checkPassword(String(fd.get("password")), u.passwordHash)) redirect(`/login?error=1${safe !== "/app" ? "&next=" + encodeURIComponent(safe) : ""}`);
  await startSession(u.id);
  redirect(safe);
}

const ICONMAIL = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>;
const ICONLOCK = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>;

export const metadata = { title: "Log in" };
export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "";
  if (await currentUser()) redirect(next || "/app");
  return (
    <div role="main" id="main" className="screen center auth d-auth">
      <ClearOfflineData />
      <AuthTop title="Welcome Back" on="login" />
      <form action={login} className="kit-form">
        {sp.error && (
          <div className="err">
            {sp.error === "google" || sp.error === "microsoft" || sp.error === "apple"
              ? `${sp.error[0].toUpperCase()}${sp.error.slice(1)} login isn't set up on this server yet. Use email and password for now.`
              : sp.error === "ssofail" || sp.error === "gfail" ? "Sign-in didn't complete. Please try again."
              : "Wrong email or password."}
          </div>
        )}
        <input type="hidden" name="next" value={next} />
        <IconField icon={ICONMAIL}><span className="sr-only">Email address</span><input id="login-email" name="email" type="email" placeholder="Email Address" required autoComplete="email" /></IconField>
        <IconField icon={ICONLOCK}><span className="sr-only">Password</span><input id="login-password" name="password" type="password" placeholder="Password" required autoComplete="current-password" /></IconField>
        <button>Sign In</button>
      </form>
      <div className="d-or">or continue with</div>
      <SsoButtons next={next || undefined} />
      <p className="d-t2" style={{ textAlign: "center", marginTop: 16 }}>New to TapNodd? <Link href="/signup">Create a free account</Link><br />Demo: demo@founder.example / demo1234</p>
    </div>
  );
}
