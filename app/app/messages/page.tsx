import Link from "next/link";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { otherOf } from "@/lib/messages";
import Avatar from "@/components/avatar";
import Icon from "@/components/icon";
import PageHead from "@/components/page-head";
export const dynamic = "force-dynamic";
export const metadata = { title: "Messages" };

const when = (d: Date) => {
  const now = new Date(), y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

/** Messages (design 21): private conversations with other TapNodd members. */
export default async function Messages({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { profile } = await requireOwner();
  const q = ((await searchParams).q ?? "").trim().toLowerCase();
  const convs = await db.conversation.findMany({
    where: { OR: [{ aId: profile.id }, { bId: profile.id }], messages: { some: {} } },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: { updatedAt: "desc" }, take: 100,
  });
  const people = await db.profile.findMany({ where: { id: { in: convs.map((c) => otherOf(c, profile.id)) } }, select: { id: true, name: true, handle: true, photo: true, headline: true } });
  const unread = await db.message.groupBy({ by: ["conversationId"], where: { conversationId: { in: convs.map((c) => c.id) }, readAt: null, senderId: { not: profile.id } }, _count: true });
  const rows = convs.map((c) => ({ c, who: people.find((p) => p.id === otherOf(c, profile.id)), last: c.messages[0], n: unread.find((u) => u.conversationId === c.id)?._count ?? 0 }))
    .filter((r) => r.who && (!q || `${r.who.name} ${r.c.subject} ${r.last?.body ?? ""}`.toLowerCase().includes(q)))
    .sort((x, y) => (y.last?.createdAt.getTime() ?? 0) - (x.last?.createdAt.getTime() ?? 0));
  return (
    <>
      <PageHead title="Messages" back="/app" />
      <form className="dz-search" role="search" action="/app/messages">
        <Icon name="search" />
        <label className="sr-only" htmlFor="mq">Search messages</label>
        <input id="mq" name="q" defaultValue={q} placeholder="Search messages..." autoComplete="off" />
      </form>
      {rows.length === 0 && <div className="d-empty"><b>{q ? "Nothing matches" : "No messages yet"}</b>{q ? "Try another name or word." : "Open someone's card and tap Message to start a conversation."}</div>}
      <div className="d-msgs">
        {rows.map(({ c, who, last, n }) => (
          <Link key={c.id} href={`/app/messages/${c.id}`} className="d-msg">
            <Avatar name={who!.name} handle={who!.handle} hasPhoto={!!who!.photo} size={50} />
            <span className="d-grow"><b style={{ fontWeight: n ? 700 : 600 }}>{who!.name}</b><span>{c.subject || last?.body}</span></span>
            <span className="d-msg-r"><small>{last ? when(last.createdAt) : ""}</small>{n > 0 ? <i aria-label={`${n} unread`} /> : <span style={{ height: 10 }} />}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
