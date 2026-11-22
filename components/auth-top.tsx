import Link from "next/link";
import Logo from "@/components/logo";

/** The design's sign-in header: mark, wordmark, title, then Sign Up / Sign In tabs. */
export default function AuthTop({ title, on }: { title: string; on: "signup" | "login" }) {
  return (
    <>
      <div className="d-auth-top">
        <Logo size={52} />
        <span className="d-word">TapNodd<sup>™</sup></span>
        <h1>{title}</h1>
      </div>
      <nav className="d-tabs" aria-label="Account">
        <Link href="/signup" aria-current={on === "signup" ? "page" : undefined}>Sign Up</Link>
        <Link href="/login" aria-current={on === "login" ? "page" : undefined}>Sign In</Link>
      </nav>
    </>
  );
}

/** A field with a leading icon, as drawn in the design. */
export function IconField({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <label className="d-field">{icon}{children}</label>;
}
