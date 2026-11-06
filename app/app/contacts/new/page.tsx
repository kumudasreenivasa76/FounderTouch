import PageHead from "@/components/page-head";
import PhoneField from "@/components/phone-field";
import { requireOwner } from "@/lib/auth";
import { addContactFull } from "../actions";
export const dynamic = "force-dynamic";
export const metadata = { title: "Add a connection" };

/** Add someone you met without a scan, for example from a paper business card. */
export default async function NewContact({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const sp = await searchParams;
  await requireOwner();
  return (
    <>
      <PageHead title="Add a connection" sub="For people you met without a scan." back="/app/contacts" error={sp.err ? "Add a name and a valid email." : undefined} />
      <form action={addContactFull} className="card">
        <label className="f" htmlFor="n-name">Name</label><input id="n-name" name="name" required />
        <label className="f" htmlFor="n-email">Email</label><input id="n-email" name="email" type="email" required />
        <div className="row">
          <div><label className="f" htmlFor="n-title">Job title</label><input id="n-title" name="jobTitle" /></div>
          <div><label className="f" htmlFor="n-co">Company</label><input id="n-co" name="company" /></div>
        </div>
        <label className="f" htmlFor="n-phone">Phone</label><PhoneField id="n-phone" name="phone" />
        <label className="f" htmlFor="n-met">Where did you meet?</label><input id="n-met" name="metAt" placeholder="e.g. Expo 2026" />
        <label className="f" htmlFor="n-tags">Tags (comma separated)</label><input id="n-tags" name="tags" placeholder="investor, hot lead" />
        <label className="f" htmlFor="n-fu">Follow up on (optional)</label><input id="n-fu" name="followUp" type="date" />
        <button>Add connection</button>
      </form>
    </>
  );
}
