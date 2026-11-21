/** Demo conversations for the Messages screen. Safe to run again: threads that already have messages are left alone. */
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const THREADS: { with: string; subject: string; msgs: [0 | 1, string, number][] }[] = [
  { with: "rahul", subject: "Investment discussion", msgs: [[1, "Great meeting you at the summit. Could you send the latest deck?", 30], [0, "Of course. Sending it through the Investor kit now.", 28], [1, "Got it, thanks. Can we talk numbers on Thursday?", 2]] },
  { with: "maya", subject: "Partnership opportunity", msgs: [[1, "Our welding line could use your defect model. Open to a pilot?", 50], [0, "Very open. What volume are you running each week?", 47], [1, "About 4,000 parts. I will share the specs.", 1]] },
  { with: "kavya", subject: "Hiring: Product designer", msgs: [[0, "Hi Kavya, are you still looking for a product designer intro?", 96], [1, "Yes please! Leah looked great.", 90]] },
  { with: "arjun", subject: "Founder Summit 2026", msgs: [[1, "See you at the Founder Summit? We have a booth near the main stage.", 160]] },
];

async function main() {
  const me = await db.profile.findUnique({ where: { handle: "demo" } });
  if (!me) return console.log("demo-messages: no demo profile, skipped");
  for (const t of THREADS) {
    const other = await db.profile.findUnique({ where: { handle: t.with } });
    if (!other) continue;
    const k = me.id < other.id ? { aId: me.id, bId: other.id } : { aId: other.id, bId: me.id };
    const c = await db.conversation.upsert({ where: { aId_bId: k }, update: {}, create: { ...k, subject: t.subject } });
    if (await db.message.count({ where: { conversationId: c.id } })) continue;
    for (const [fromOther, body, hoursAgo] of t.msgs) {
      const at = new Date(Date.now() - hoursAgo * 3600_000);
      await db.message.create({ data: { conversationId: c.id, senderId: fromOther ? other.id : me.id, body, createdAt: at, readAt: fromOther && hoursAgo > 24 ? at : null } });
    }
  }
  console.log("demo-messages: done");
}
main().finally(() => db.$disconnect());
