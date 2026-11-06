import { ClearOfflineData } from "@/components/sw-register";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { checkPassword, currentUser, startSession } from "@/lib/auth";
import Logo from "@/components/logo";
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

export const metadata = { title: "Log in" };
export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "";
  if (await currentUser()) redirect(next || "/app");
  return (
    <div role="main" id="main" className="screen center auth">
      <ClearOfflineData />
      <div className="auth-hero">
        <Logo size={78} className="auth-logo" />
        <span className="auth-hi brand-word">Tap<span>Nodd</span></span>
      </div>
      <h1>Welcome back</h1>
      <p className="sub">Sign in to continue</p>
      {sp.error && (
        <div className="err">
          {sp.error === "google" || sp.error === "microsoft" || sp.error === "apple"
            ? `${sp.error[0].toUpperCase()}${sp.error.slice(1)} login isn't set up on this server yet. Use email and password for now.`
            : sp.error === "ssofail" || sp.error === "gfail" ? "Sign-in didn't complete. Please try again."
            : "Wrong email or password."}
        </div>
      )}
      <form action={login} className="kit-form">
        <input type="hidden" name="next" value={next} />
        <input name="email" type="email" placeholder="Email" required autoComplete="email" />
        <input name="password" type="password" placeholder="Password" required autoComplete="current-password" />
        <button>Log in</button>
      </form>
      <p className="muted" style={{ textAlign: "center", marginTop: 14 }}>New here? <Link href="/signup">Create account</Link></p>
      <div className="or-div">or</div>
      <SsoButtons next={next || undefined} />
      <p className="muted" style={{ textAlign: "center", marginTop: 16 }}>Demo: demo@founder.example / demo1234</p>
    </div>
  );
}
