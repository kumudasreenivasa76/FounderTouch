import { db } from "@/lib/db";
import { EVENTS } from "@/lib/integrations";
import { addIntegration, toggleIntegration, deleteIntegration, testIntegration } from "@/app/app/integrations/actions";

const EV_LABEL: Record<string, string> = { "contact.created": "New contact request", "contact.accepted": "Connection accepted", "event.registered": "Event registration" };

/** Webhook and Slack connections for either your own card or the whole team. */
export default async function IntegrationsPanel({ scope, where }: { scope: "me" | "org"; where: { profileId: string } | { orgId: string } }) {
  const list = await db.integration.findMany({ where, orderBy: { createdAt: "asc" }, include: { deliveries: { orderBy: { createdAt: "desc" }, take: 3 } } });
  return (
    <>
      {list.length === 0 && <div className="card muted">Nothing connected yet.</div>}
      {list.map((i) => (
        <div className="card" key={i.id}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <b style={{ flex: 1, minWidth: 0 }}>{i.label}</b>
            <span className="pill" style={{ margin: 0 }}>{i.kind === "SLACK" ? "Slack" : "Webhook"}</span>
            <span className={"pill" + (i.enabled ? " on" : "")} style={{ margin: 0 }}>{i.enabled ? "On" : "Off"}</span>
          </div>
          <div className="muted" style={{ overflowWrap: "anywhere" }}>{new URL(i.url).host}</div>
          <div className="muted">{i.events.split(",").map((e) => EV_LABEL[e] ?? e).join(" · ")}</div>
          {i.kind === "WEBHOOK" && i.secret && <details><summary>Signing secret</summary><code style={{ overflowWrap: "anywhere" }}>{i.secret}</code><p className="muted" style={{ marginBottom: 0 }}>Each request carries <code>X-TapNodd-Signature: sha256=…</code>, an HMAC of the body with this secret.</p></details>}
          <p className="muted" style={{ margin: "6px 0" }}>{i.lastAt ? `Last sent ${i.lastAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}: ${i.lastStatus === "ok" ? "delivered" : i.lastStatus}` : "Not sent yet"}</p>
          {i.deliveries.length > 0 && <div className="muted">{i.deliveries.map((d) => `${d.ok ? "✓" : ""} ${EV_LABEL[d.event] ?? d.event}`).join("  ")}</div>}
          <div className="row" style={{ marginTop: 8, flexWrap: "wrap" }}>
            {[[testIntegration, "Send test", ""], [toggleIntegration, i.enabled ? "Turn off" : "Turn on", "ghost"], [deleteIntegration, "Delete", "ghost"]].map(([act, label, cls]) => (
              <form key={String(label)} action={act as (fd: FormData) => Promise<void>}><input type="hidden" name="id" value={i.id} /><input type="hidden" name="scope" value={scope} /><button className={String(cls)}>{String(label)}</button></form>
            ))}
          </div>
        </div>
      ))}

      <form action={addIntegration} className="card">
        <h2 style={{ fontSize: 16, marginTop: 0 }}>Add a connection</h2>
        <input type="hidden" name="scope" value={scope} />
        <label className="f" htmlFor={`k-${scope}`}>Where to send it</label>
        <select id={`k-${scope}`} name="kind"><option value="WEBHOOK">Webhook (Zapier, Make, n8n, your CRM)</option><option value="SLACK">Slack channel</option></select>
        <label className="f" htmlFor={`l-${scope}`}>Name</label>
        <input id={`l-${scope}`} name="label" maxLength={60} required placeholder="e.g. HubSpot via Zapier" />
        <label className="f" htmlFor={`u-${scope}`}>Address (https only)</label>
        <input id={`u-${scope}`} name="url" required inputMode="url" placeholder="https://hooks.zapier.com/…" />
        <fieldset style={{ border: 0, padding: 0, margin: "8px 0" }}>
          <legend className="muted">Send me</legend>
          {EVENTS.map((e) => <label key={e} style={{ display: "block", margin: "4px 0" }}><input type="checkbox" name={`ev_${e}`} defaultChecked />{EV_LABEL[e]}</label>)}
        </fieldset>
        <button>Connect</button>
        <p className="muted" style={{ marginBottom: 0 }}>For Salesforce, HubSpot, Dynamics or Marketo, create a &ldquo;catch webhook&rdquo; in Zapier or Make and paste its address here.</p>
      </form>
    </>
  );
}
