"use client";
import { useState } from "react";

const STEPS = ["Basics", "When & where", "Registration", "Review"];

/** Step-by-step event creator. Every step is optional except the name; the rest can be edited later on the event page. */
export default function EventWizard({ action }: { action: (fd: FormData) => void }) {
  const [step, setStep] = useState(0);
  const [v, setV] = useState({ name: "", summary: "", description: "", format: "IN_PERSON", visibility: "PUBLIC", location: "", onlineUrl: "", startsAt: "", endsAt: "", capacity: "0", requireApproval: false, waitlist: false });
  const set = (k: string, val: string | boolean) => setV((p) => ({ ...p, [k]: val }));
  const last = step === STEPS.length - 1;
  const online = v.format !== "IN_PERSON", venue = v.format !== "ONLINE";

  return (
    <form action={action} className="card" onKeyDown={(e) => { if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") e.preventDefault(); }}>
      <h2 style={{ marginTop: 0, fontSize: 16 }}>Create an event</h2>
      <div className="chips" style={{ marginBottom: 12 }}>
        {STEPS.map((s, i) => <button key={s} type="button" className={"pill" + (i === step ? " on" : "")} onClick={() => setStep(i)} style={{ padding: "6px 12px" }}>{i + 1}. {s}</button>)}
      </div>

      {/* all fields stay mounted so the form always submits every value */}
      <div hidden={step !== 0}>
        <label className="f">Event name</label>
        <input name="name" value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Bengaluru AI Hackathon" required />
        <label className="f">Short summary</label>
        <input name="summary" value={v.summary} onChange={(e) => set("summary", e.target.value)} maxLength={200} />
        <label className="f">About the event</label>
        <textarea name="description" rows={3} value={v.description} onChange={(e) => set("description", e.target.value)} placeholder="Theme, prizes, who it is for…" />
        <label className="f">Visibility</label>
        <select name="visibility" value={v.visibility} onChange={(e) => set("visibility", e.target.value)}>
          <option value="PUBLIC">Public</option><option value="UNLISTED">Unlisted (link only)</option><option value="INVITE">Invite only (you approve each person)</option>
        </select>
      </div>

      <div hidden={step !== 1}>
        <label className="f">Format</label>
        <select name="format" value={v.format} onChange={(e) => set("format", e.target.value)}>
          <option value="IN_PERSON">In person</option><option value="ONLINE">Online</option><option value="HYBRID">Hybrid</option>
        </select>
        {venue && <><label className="f">Venue</label><input name="location" value={v.location} onChange={(e) => set("location", e.target.value)} placeholder="Address or room" /></>}
        {online && <><label className="f">Online link (https)</label><input name="onlineUrl" value={v.onlineUrl} onChange={(e) => set("onlineUrl", e.target.value)} inputMode="url" placeholder="Zoom or Meet link" /></>}
        <div className="row">
          <div><label className="f">Starts</label><input name="startsAt" type="datetime-local" value={v.startsAt} onChange={(e) => set("startsAt", e.target.value)} /></div>
          <div><label className="f">Ends</label><input name="endsAt" type="datetime-local" value={v.endsAt} onChange={(e) => set("endsAt", e.target.value)} /></div>
        </div>
      </div>

      <div hidden={step !== 2}>
        <label className="f">Capacity (0 = unlimited)</label>
        <input name="capacity" type="number" min={0} value={v.capacity} onChange={(e) => set("capacity", e.target.value)} />
        <label style={{ display: "block", margin: "8px 0" }}><input type="checkbox" name="requireApproval" checked={v.requireApproval} onChange={(e) => set("requireApproval", e.target.checked)} />I approve each registration</label>
        <label style={{ display: "block", margin: "8px 0" }}><input type="checkbox" name="waitlist" checked={v.waitlist} onChange={(e) => set("waitlist", e.target.checked)} />Keep a waitlist when full</label>
        <p className="muted">Ticket types, meals, staff and recruiting are added on the event page after you create it.</p>
      </div>

      <div hidden={step !== 3}>
        <div className="card" style={{ background: "#f7f8fb" }}>
          <b>{v.name || "Untitled event"}</b>
          {v.summary && <div className="muted">{v.summary}</div>}
          <div className="muted">{v.format.replace("_", " ").toLowerCase()} · {v.visibility.toLowerCase()} · {v.startsAt ? new Date(v.startsAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "no date yet"}</div>
          <div className="muted">{v.capacity !== "0" ? `${v.capacity} places` : "unlimited places"}{v.requireApproval ? " · approval needed" : ""}{v.waitlist ? " · waitlist" : ""}</div>
        </div>
        {!v.name.trim() && <div className="err">Add an event name in step 1.</div>}
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        {step > 0 && <button type="button" className="ghost" onClick={() => setStep(step - 1)}>Back</button>}
        {!last && <button type="button" onClick={() => setStep(step + 1)}>Next</button>}
        {last && <button disabled={!v.name.trim()}>Create as draft</button>}
      </div>
    </form>
  );
}
