import { redirect } from "next/navigation";
import Link from "next/link";
import I from "@/components/icon";
import { db } from "@/lib/db";
import { checkPassword, currentUser, startSession } from "@/lib/auth";

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

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "";
  if (await currentUser()) redirect(next || "/app");
  return (
    <div className="screen auth">
      <div className="wordmark"><span className="logo">ft</span>FounderTouch</div>
      <h1>Welcome back</h1>
      <p className="muted">Log in to manage your card and contacts.</p>
      {sp.error && <div className="err"><I n="alert" size={16} /> Wrong email or password.</div>}
      <form action={login}>
        <input type="hidden" name="next" value={next} />
        <label className="f" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" placeholder="you@company.com" required autoComplete="email" />
        <label className="f" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" />
        <button style={{ marginTop: 8 }}>Log in</button>
      </form>
      <p className="muted" style={{ marginTop: 18 }}>New here? <Link href="/signup">Create an account</Link></p>
      <p className="muted demo-note">Demo account: demo@founder.example / demo1234</p>
    </div>
  );
}
