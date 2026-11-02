import { redirect } from "next/navigation";
import Link from "next/link";
import I from "@/components/icon";
import { currentUser, startSession } from "@/lib/auth";
import { REGISTER_MSG, RegisterError, registerUser } from "@/lib/accounts";
import { getSettings, openInvite } from "@/lib/platform";

async function signup(fd: FormData) {
  "use server";
  const invite = String(fd.get("invite") ?? "");
  const back = (e: string) => redirect(`/signup?error=${e}${invite ? "&invite=" + encodeURIComponent(invite) : ""}`);
  const r = await registerUser({ firstName: String(fd.get("firstName")), lastName: String(fd.get("lastName")), email: String(fd.get("email")), password: String(fd.get("password")), invite: invite || undefined });
  if (!r.ok) return back(r.error);
  await startSession(r.userId);
  redirect(r.hasProfile ? "/app" : "/onboarding");
}

export default async function Signup({ searchParams }: { searchParams: Promise<{ error?: string; invite?: string }> }) {
  if (await currentUser()) redirect("/app");
  const sp = await searchParams;
  const invite = sp.invite ? await openInvite(sp.invite) : null;
  const settings = await getSettings();
  const closed = !invite && settings.signup === "invite";
  const [first = "", ...rest] = (invite?.name ?? "").split(/\s+/);
  return (
    <div className="screen auth">
      <div className="wordmark"><span className="logo">ft</span>FounderTouch</div>
      <h1>{invite ? `Welcome${first ? ", " + first : ""}` : "Create your account"}</h1>
      <p className="muted">{invite ? "The FounderTouch team set up your card. Choose a password and you are in." : "One card for every room you walk into. Takes under a minute."}</p>
      {sp.invite && !invite && !sp.error && <div className="err"><I n="alert" size={16} /> {REGISTER_MSG["invite-dead"]}</div>}
      {sp.error && <div className="err"><I n="alert" size={16} /> {REGISTER_MSG[sp.error as RegisterError] ?? "Something went wrong."}</div>}
      {closed ? (
        <div className="card">
          <h3><I n="lock" /> Sign-ups are by invitation</h3>
          <p className="muted" style={{ margin: 0 }}>FounderTouch is onboarding people by invite right now. If someone from the team sent you a link, open it to join.</p>
        </div>
      ) : (
        <form action={signup}>
          {invite && <input type="hidden" name="invite" value={invite.token} />}
          <div className="row">
            <div><label className="f" htmlFor="fn">First name</label><input id="fn" name="firstName" required autoComplete="given-name" defaultValue={first} /></div>
            <div><label className="f" htmlFor="ln">Last name</label><input id="ln" name="lastName" required autoComplete="family-name" defaultValue={rest.join(" ")} /></div>
          </div>
          <label className="f" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" placeholder="you@company.com" required autoComplete="email" defaultValue={invite?.email} readOnly={!!invite} />
          <label className="f" htmlFor="password">Password</label>
          <input id="password" name="password" type="password" placeholder="At least 8 characters" required autoComplete="new-password" />
          <button style={{ marginTop: 8 }}>{invite ? "Join FounderTouch" : "Continue"}</button>
        </form>
      )}
      <p className="muted" style={{ marginTop: 18 }}>Have an account? <Link href="/login">Log in</Link></p>
    </div>
  );
}
