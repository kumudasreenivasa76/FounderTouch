import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { currentUser } from "@/lib/auth";
import { checkCode, issueCode } from "@/lib/verify";
import CodeForm from "./code-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Verify your email" };

async function verify(fd: FormData) {
  "use server";
  const u = await currentUser();
  if (!u) redirect("/login");
  const r = await checkCode(u.id, String(fd.get("code") ?? ""));
  if (r === "ok") redirect(u.profile ? "/app" : "/onboarding");
  redirect(`/verify?error=${r}`);
}

async function resend() {
  "use server";
  const u = await currentUser();
  if (!u) redirect("/login");
  await issueCode(u.id, u.email);
  redirect("/verify?sent=1");
}

/** Email verification (design 4): a 6-digit code sent after sign up. */
export default async function Verify({ searchParams }: { searchParams: Promise<{ error?: string; sent?: string }> }) {
  const u = await currentUser();
  if (!u) redirect("/login");
  if (u.emailVerified) redirect(u.profile ? "/app" : "/onboarding");
  const sp = await searchParams;
  const hint = (await cookies()).get("vhint")?.value;
  return (
    <div role="main" id="main" className="screen d-verify">
      <span className="d-verify-ico" aria-hidden>
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
      </span>
      <h1>Verify Your Email</h1>
      <p>We&apos;ve sent a verification code to<br /><strong>{u.email}</strong></p>
      {sp.error && <div className="err" role="alert">{sp.error === "expired" ? "That code has expired. Send a new one." : "That code is not right. Check the email and try again."}</div>}
      {sp.sent && !sp.error && <div className="ok" role="status">A new code is on its way.</div>}
      <CodeForm verify={verify} resend={resend} />
      {hint && <p className="d-verify-hint">Email is not set up on this server yet, so here is your code: <b>{hint}</b></p>}
    </div>
  );
}
