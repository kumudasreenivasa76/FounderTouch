import { db } from "./db";

/** Conversations store the two profile ids in a fixed order so each pair has exactly one thread. */
export const pair = (x: string, y: string) => (x < y ? { aId: x, bId: y } : { aId: y, bId: x });
export const otherOf = (c: { aId: string; bId: string }, me: string) => (c.aId === me ? c.bId : c.aId);

export async function openConversation(me: string, other: string, subject = "") {
  const k = pair(me, other);
  return db.conversation.upsert({ where: { aId_bId: k }, update: {}, create: { ...k, subject } });
}

export async function unreadCount(me: string) {
  return db.message.count({ where: { readAt: null, senderId: { not: me }, conversation: { OR: [{ aId: me }, { bId: me }] } } });
}
