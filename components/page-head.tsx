import Link from "next/link";
import I from "@/components/icon";

/** Back link, title and an optional saved / error banner for the profile sub-screens. */
export default function PageHead({ title, sub, back = "/app/profile", saved, error }: { title: string; sub?: string; back?: string | null; saved?: boolean; error?: string }) {
  return (
    <>
      {back && <Link href={back} className="back"><I n="arrow-left" size={16} />Back</Link>}
      <h1 style={{ marginTop: 4 }}>{title}</h1>
      {sub && <p className="muted" style={{ marginTop: 0 }}>{sub}</p>}
      {saved && <div className="ok"><I n="check" size={16} /> Saved</div>}
      {error && <div className="err"><I n="alert" size={16} /> {error}</div>}
    </>
  );
}
