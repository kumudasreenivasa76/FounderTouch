import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import PageHead from "@/components/page-head";
import IntegrationsPanel from "@/components/integrations-panel";
import { createToken, revokeToken } from "./actions";
export const dynamic = "force-dynamic";
export const metadata = { title: "Integrations" };

/** Connect your card to the tools you already use: webhooks (Zapier, Make, n8n), Slack, and an API key. */
export default async function Integrations({ searchParams }: { searchParams: Promise<{ saved?: string; err?: string }> }) {
  const sp = await searchParams;
  const { profile } = await requireOwner();
  const tokens = await db.apiToken.findMany({ where: { profileId: profile.id }, orderBy: { createdAt: "desc" } });
  const fresh = (await cookies()).get("new_token")?.value;
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  return (
    <>
      <PageHead title="Integrations" sub="Send new contacts to the tools you use." back="/app/more" saved={!!sp.saved} error={sp.err === "url" ? "Use a name and a public https address." : undefined} />
      <IntegrationsPanel scope="me" where={{ profileId: profile.id }} />

      <h2 style={{ fontSize: 16, margin: "18px 0 8px" }}>API key</h2>
      <div className="card">
        <p className="muted" style={{ marginTop: 0 }}>Read your connected contacts from your own scripts or sheets.</p>
        {fresh && <div className="ok" role="status">Copy your key now, it is shown once: <code style={{ overflowWrap: "anywhere" }}>{fresh}</code></div>}
        {tokens.map((t) => (
          <form key={t.id} action={revokeToken} className="row" style={{ marginBottom: 6, alignItems: "center" }}>
            <input type="hidden" name="id" value={t.id} />
            <span>{t.label} <span className="muted">· {t.lastUsedAt ? `used ${t.lastUsedAt.toLocaleDateString("en-IN")}` : "never used"}</span></span>
            <button className="ghost sm">Revoke</button>
          </form>
        ))}
        <form action={createToken} className="row">
          <input name="label" placeholder="Name, e.g. Sheets" maxLength={60} aria-label="Key name" />
          <button style={{ width: "auto" }}>Create key</button>
        </form>
        <details style={{ marginTop: 8 }}><summary>How to use it</summary>
          <code style={{ overflowWrap: "anywhere", display: "block" }}>curl -H &quot;Authorization: Bearer YOUR_KEY&quot; {origin}/api/v1/contacts</code>
        </details>
      </div>
    </>
  );
}
