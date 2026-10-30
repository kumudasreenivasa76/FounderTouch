import Link from "next/link";

/** Back link, title and an optional saved / error banner for the profile sub-screens. */
export default function PageHead({ title, sub, back = "/app/profile", saved, error }: { title: string; sub?: string; back?: string; saved?: boolean; error?: string }) {
  return (
    <>
      <Link href={back} className="muted">← Back</Link>
      <h1 style={{ marginTop: 4 }}>{title}</h1>
      {sub && <p className="muted" style={{ marginTop: 0 }}>{sub}</p>}
      {saved && <div className="ok">Saved ✓</div>}
      {error && <div className="err">{error}</div>}
    </>
  );
}
