import { redirect } from "next/navigation";
import Link from "next/link";
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
    <div className="screen center">
      <div className="logo">F</div>
      <h1 style={{ textAlign: "center" }}>Welcome back</h1>
      <p className="muted" style={{ textAlign: "center" }}>Log in to your FounderTouch</p>
      {sp.error && <div className="err">Wrong email or password.</div>}
      <form action={login}>
        <input type="hidden" name="next" value={next} />
        <input name="email" type="email" placeholder="Email" required autoComplete="email" />
        <input name="password" type="password" placeholder="Password" required autoComplete="current-password" />
        <button>Log in</button>
      </form>
      <p className="muted" style={{ textAlign: "center", marginTop: 16 }}>New here? <Link href="/signup">Create account</Link></p>
      <p className="muted" style={{ textAlign: "center" }}>Demo: demo@founder.example / demo1234</p>
    </div>
  );
}
