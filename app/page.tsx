import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/auth";
import Logo from "@/components/logo";

export const dynamic = "force-dynamic";
export const metadata = { title: "TapNodd: Tap. Share. Connect." };

/** Splash (design 1): signed-in people go straight to the app; everyone else starts the intro or signs in. */
export default async function Splash() {
  if (await currentUser()) redirect("/app");
  return (
    <div role="main" id="main" className="screen d-splash">
      <div className="d-splash-glow" aria-hidden />
      <div className="d-splash-mark"><Logo size={92} /></div>
      <h1>TapNodd<sup>™</sup></h1>
      <p className="d-splash-tag">Tap. Share. Connect.</p>
      <p className="d-splash-sub">Your professional identity with multiple modes to build connections, showcase your work and grow opportunities.</p>

      <div className="d-splash-stage" aria-hidden>
        <div className="d-splash-shadow" />
        <div className="d-splash-card">
          <div className="d-splash-sheen" />
          <div className="d-sc-top">
            <img src="/intro/avatar.jpg" alt="" width={44} height={44} />
            <span><b>Alex Rao</b><small>Founder &amp; CEO · Lumen Labs</small></span>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M8.5 8.5a5 5 0 0 1 0 7M12 6a8.5 8.5 0 0 1 0 12M15.5 3.5a12 12 0 0 1 0 17" /></svg>
          </div>
          <div className="d-sc-bot">
            <span className="d-sc-chips"><i className="on">Founder</i><i>Investor</i></span>
            <small>tapnodd.com/founder</small>
          </div>
        </div>
      </div>

      <div className="dots d-splash-dots" aria-hidden><span className="on" /><span /><span /><span /></div>
      <span style={{ flex: 1 }} />
      <Link href="/welcome" className="btn d-next">Get Started<span className="d-bico" aria-hidden><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span></Link>
      <Link href="/login" className="d-splash-in">Sign In</Link>
    </div>
  );
}
