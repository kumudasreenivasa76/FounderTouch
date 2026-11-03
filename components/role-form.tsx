import { EMPLOYMENT, WORK_TYPES } from "@/lib/hiring";

type Job = { id?: string; title?: string; location?: string; workType?: string; employment?: string; salary?: string; skills?: string; description?: string; eventId?: string | null };

/** The form for posting or editing a role. Same fields in both places. */
export default function RoleForm({ action, job, events, submit }: { action: (fd: FormData) => void | Promise<void>; job?: Job; events: { id: string; name: string }[]; submit: string }) {
  return (
    <form action={action} className="card">
      {job?.id && <input type="hidden" name="id" value={job.id} />}
      <label className="f" htmlFor="r-title">Job title</label>
      <input id="r-title" name="title" required maxLength={120} defaultValue={job?.title} placeholder="e.g. Senior Product Designer" />
      <label className="f" htmlFor="r-loc">Location</label>
      <input id="r-loc" name="location" maxLength={100} defaultValue={job?.location} placeholder="e.g. Bengaluru" />
      <div className="row">
        <div><label className="f" htmlFor="r-wt">Work type</label><select id="r-wt" name="workType" defaultValue={job?.workType ?? ""}><option value="">Not set</option>{WORK_TYPES.map((w) => <option key={w}>{w}</option>)}</select></div>
        <div><label className="f" htmlFor="r-emp">Employment</label><select id="r-emp" name="employment" defaultValue={job?.employment ?? "Full-time"}>{EMPLOYMENT.map((w) => <option key={w}>{w}</option>)}</select></div>
      </div>
      <label className="f" htmlFor="r-pay">Pay (optional)</label>
      <input id="r-pay" name="salary" maxLength={80} defaultValue={job?.salary} placeholder="e.g. ₹18–25 LPA" />
      <label className="f" htmlFor="r-skills">Key skills (comma separated; used to match candidates)</label>
      <input id="r-skills" name="skills" maxLength={400} defaultValue={job?.skills} placeholder="Figma, Prototyping, Research" />
      <label className="f" htmlFor="r-desc">About the role</label>
      <textarea id="r-desc" name="description" rows={6} maxLength={4000} defaultValue={job?.description} placeholder="What the person will do, and what you are looking for." />
      <label className="f" htmlFor="r-ev">Hiring event (optional)</label>
      <select id="r-ev" name="eventId" defaultValue={job?.eventId ?? ""}><option value="">Not tied to an event</option>{events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
      <button>{submit}</button>
    </form>
  );
}
