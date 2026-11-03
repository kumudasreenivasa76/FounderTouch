import Link from "next/link";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div role="main" id="main" className="screen center" style={{ textAlign: "center" }}>
      <div className="logo" aria-hidden>F</div>
      <h1>We couldn&apos;t find that page</h1>
      <p className="muted">The link may be old, or the card may have been hidden by its owner.</p>
      <Link href="/app" className="btn">Go Home</Link>
    </div>
  );
}
