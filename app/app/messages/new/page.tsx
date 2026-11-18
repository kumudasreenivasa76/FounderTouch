import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { openConversation } from "@/lib/messages";

/** /app/messages/new?to=handle opens (or starts) the conversation with that person. */
export default async function NewMessage({ searchParams }: { searchParams: Promise<{ to?: string; subject?: string }> }) {
  const { profile } = await requireOwner();
  const sp = await searchParams;
  const other = sp.to ? await db.profile.findUnique({ where: { handle: sp.to } }) : null;
  if (!other || other.id === profile.id || !other.userId) notFound();
  const c = await openConversation(profile.id, other.id, (sp.subject ?? "").slice(0, 80));
  redirect(`/app/messages/${c.id}`);
}
