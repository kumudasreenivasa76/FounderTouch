import PageHead from "@/components/page-head";
import { requireOwner } from "@/lib/auth";
import { importContacts } from "../actions";
export const dynamic = "force-dynamic";
export const metadata = { title: "Import connections" };

const ERR: Record<string, string> = { empty: "That file has no rows. Add a header row and at least one person.", columns: "The first row must include an email column." };

/** Bring in a list you already have: a CSV from a spreadsheet, your phone, or another card app. */
export default async function Import({ searchParams }: { searchParams: Promise<{ err?: string; done?: string; added?: string; updated?: string; skipped?: string }> }) {
  const sp = await searchParams;
  await requireOwner();
  return (
    <>
      <PageHead title="Import connections" sub="Upload a CSV, or paste rows from a spreadsheet." back="/app/contacts" error={sp.err ? ERR[sp.err] : undefined} />
      {sp.done && <div className="ok" role="status">Done: {sp.added} added, {sp.updated} updated{Number(sp.skipped) ? `, ${sp.skipped} skipped (no valid email)` : ""}.</div>}
      <form action={importContacts} className="card" encType="multipart/form-data">
        <label className="f" htmlFor="i-file">CSV file</label>
        <input id="i-file" name="file" type="file" accept=".csv,text/csv,text/plain" />
        <label className="f" htmlFor="i-text">Or paste it here</label>
        <textarea id="i-text" name="text" rows={6} placeholder={"name,email,company,phone,title,tags\nAna Rao,ana@acme.com,Acme,+91 98765 43210,CTO,investor"} />
        <button>Import</button>
        <p className="muted" style={{ marginBottom: 0 }}>Columns it understands: name, email, company, phone, title, tags. Email is required. People already in your list are updated, never duplicated. Up to 500 rows at a time.</p>
      </form>
    </>
  );
}
