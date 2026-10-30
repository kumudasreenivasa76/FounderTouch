import Link from "next/link";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import PageHead from "@/components/page-head";
import { addSection, delSection } from "../actions";
export const dynamic = "force-dynamic";

export default async function Sections({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const sp = await searchParams;
  const { profile } = await requireOwner();
  const sections = await db.section.findMany({ where: { profileId: profile.id }, orderBy: { order: "asc" } });
  return (
    <>
      <PageHead title="Page sections" sub="Text blocks like About, Traction or Pricing. Choose which ones each mode shows from the Share tab." saved={!!sp.saved} />
      {sections.map((s) => (
        <div className="card" key={s.id}>
          <b>{s.title}</b><div className="muted" style={{ whiteSpace: "pre-wrap" }}>{s.body}</div>
          <form action={delSection} style={{ marginTop: 8 }}><input type="hidden" name="id" value={s.id} /><button className="ghost sm">Delete</button></form>
        </div>
      ))}
      <form action={addSection} className="card">
        <h3>Add a section</h3>
        <input name="title" placeholder="Title (e.g. Traction)" required />
        <textarea name="body" rows={3} placeholder="Content" required />
        <button>Add section</button>
      </form>
      <Link href="/app" className="btn ghost">Choose what each mode shows →</Link>
    </>
  );
}
