import Link from "next/link";

/** The one back control: a square icon button at the top left. The label is read out, not shown. */
export default function BackLink({ href, label = "Back" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="tn-back" aria-label={label} title={label}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>
    </Link>
  );
}
