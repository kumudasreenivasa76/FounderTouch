import Link from "next/link";
import Logo from "@/components/logo";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div role="main" id="main" className="screen center" style={{ textAlign: "center" }}>
      <Logo size={84} style={{ margin: "0 auto 14px", display: "block" }} />
      <h1>We couldn&apos;t find that page</h1>
      <p className="muted">The link may be old, or the card may have been hidden by its owner.</p>
      <Link href="/app" className="btn">Go Home</Link>
    </div>
  );
}
