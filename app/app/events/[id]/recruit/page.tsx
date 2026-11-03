import { notFound } from "next/navigation";
import { flag } from "@/lib/flags";
import { db } from "@/lib/db";
import { eventAccess } from "@/lib/event-access";
import PageHead from "@/components/page-head";
import { recordEncounter } from "../../extra-actions";
export const dynamic = "force-dynamic";

const ERR: Record<string, string> = { unknown: "That ticket was not found or is not confirmed.", consent: "This attendee has not agreed to be contacted by recruiters." };

/** Recruiter panel for an event. Jobs, applications and resumes stay in Hire; this only records consented conversations. */
export default async function Recruit({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ err?: string; saved?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const acc = await eventAccess(id);
  if (!flag("event_recruiting_bridge") || !acc || !(acc.owner || acc.isRecruiter)) notFound();
  const [jobs, mine] = await Promise.all([
    db.job.findMany({ where: { eventId: id, open: true }, orderBy: { title: "asc" } }),
    db.recruiterEncounter.findMany({ where: { eventId: id, ...(acc.owner ? {} : { recruiterId: acc.user.id }) }, orderBy: { createdAt: "desc" } }),
  ]);
  const people = await db.attendee.findMany({ where: { id: { in: mine.map((m) => m.attendeeId) } } });
  return (
    <>
      <PageHead title="Recruiting" sub={`${acc.event.name}. Record a conversation with an attendee who agreed to recruiter contact.`} back={acc.owner ? `/app/events/${id}` : "/app"} saved={!!sp.saved} error={sp.err ? ERR[sp.err] : undefined} />
      <form action={recordEncounter} className="card">
        <input type="hidden" name="eventId" value={id} />
        <label className="f">Ticket code or link</label>
        <input name="code" placeholder="Paste the code from their ticket" required />
        <label className="f">Role to discuss (optional)</label>
        <select name="jobId"><option value="">None</option>{jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}</select>
        <label className="f">Notes</label>
        <textarea name="notes" rows={3} maxLength={500} />
        <button>Save conversation</button>
        <p className="muted" style={{ marginBottom: 0 }}>This does not create a job application and does not share a resume.</p>
      </form>
      <h2>Conversations ({mine.length})</h2>
      {mine.map((m) => {
        const p = people.find((x) => x.id === m.attendeeId), j = jobs.find((x) => x.id === m.jobId);
        return <div className="card" key={m.id}><b>{p?.name ?? "Attendee"}</b>{j && <span className="pill">{j.title}</span>}<div className="muted">{m.notes || "No notes"}</div></div>;
      })}
    </>
  );
}
