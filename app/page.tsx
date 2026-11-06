import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/auth";
import Logo from "@/components/logo";
import HeroCards from "@/components/hero-cards";

export const dynamic = "force-dynamic";

/** The welcome screen: signed-in users go straight to the app, everyone else picks log in or sign up. */
export default async function Welcome() {
  if (await currentUser()) redirect("/app");
  return (
    <div role="main" id="main" className="screen center auth">
      <div className="auth-hero">
        <Logo size={64} className="auth-logo" />
        <h1 className="brand-word" style={{ fontSize: 32, textAlign: "center", margin: "0 0 4px" }}>Tap<span>Nodd</span></h1>
        <p className="sub">Your digital business card. Share it with a tap or a scan.</p>
      </div>
      <HeroCards />
      <div className="welcome-cta">
        <Link href="/signup" className="btn">Get started</Link>
        <Link href="/login" className="btn ghost">I already have an account</Link>
      </div>
    </div>
  );
}
