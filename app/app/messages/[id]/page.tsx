import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { otherOf } from "@/lib/messages";
import { byline } from "@/lib/look";
import Avatar from "@/components/avatar";
import BackLink from "@/components/back-link";
import { sendMessage } from "../actions";
export const dynamic = "force-dynamic";
export const metadata = { title: "Conversation" };

/** One conversation: bubbles, newest at the bottom, and a reply box. */
export default async function Thread({ params }: { params: Promise<{ id: string }> }) {
  const { profile } = await requireOwner();
  const { id } = await params;
  const c = await db.conversation.findUnique({ where: { id }, include: { messages: { orderBy: { createdAt: "asc" }, take: 300 } } });
  if (!c || (c.aId !== profile.id && c.bId !== profile.id)) notFound();
  const who = await db.profile.findUnique({ where: { id: otherOf(c, profile.id) } });
  if (!who) notFound();
  await db.message.updateMany({ where: { conversationId: id, senderId: { not: profile.id }, readAt: null }, data: { readAt: new Date() } });
  const t = (d: Date) => d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  return (
    <>
      <div className="tn-top d-thread-top">
        <BackLink href="/app/messages" />
        <Link href={`/${who.handle}`} className="d-thread-who">
          <Avatar name={who.name} handle={who.handle} hasPhoto={!!who.photo} size={40} />
          <span><b>{who.name}</b><small>{byline(who.headline, who.company) || `@${who.handle}`}</small></span>
        </Link>
      </div>
      {c.subject && <p className="d-t2" style={{ textAlign: "center", margin: "0 0 12px" }}>{c.subject}</p>}
      <ol className="d-bubbles" aria-label={`Conversation with ${who.name}`}>
        {c.messages.map((m) => (
          <li key={m.id} className={m.senderId === profile.id ? "me" : ""}>
            <span>{m.body}</span>
            <small>{m.senderId === profile.id ? "You" : who.name.split(" ")[0]} · {t(m.createdAt)}</small>
          </li>
        ))}
      </ol>
      <form action={sendMessage} className="d-compose" id="end">
        <input type="hidden" name="id" value={c.id} />
        <label className="sr-only" htmlFor="msg">Message</label>
        <textarea id="msg" name="body" rows={1} maxLength={2000} placeholder={`Message ${who.name.split(" ")[0]}…`} required />
        <button className="d-send" aria-label="Send"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 12 20 4l-6 16-3-7z" /></svg></button>
      </form>
    </>
  );
}
