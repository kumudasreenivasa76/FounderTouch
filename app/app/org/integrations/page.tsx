import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/auth";
import { membership } from "@/lib/org";
import PageHead from "@/components/page-head";
import OrgNav from "@/components/org-nav";
import IntegrationsPanel from "@/components/integrations-panel";
export const dynamic = "force-dynamic";
export const metadata = { title: "Team integrations" };

/** Team-wide connections: events from everyone's cards go to the same place (your CRM, a Slack channel). */
export default async function OrgIntegrations({ searchParams }: { searchParams: Promise<{ saved?: string; err?: string }> }) {
  const sp = await searchParams;
  const { user } = await requireOwner();
  const m = await membership(user.id);
  if (!m || !m.isAdmin) notFound();
  return (
    <>
      <PageHead title="Integrations" sub="Every new contact from anyone on the team." back="/app/org" saved={!!sp.saved} error={sp.err === "url" ? "Use a name and a public https address." : undefined} />
      <OrgNav active="integrations" isAdmin />
      <IntegrationsPanel scope="org" where={{ orgId: m.org.id }} />
    </>
  );
}
