import { db } from "./db";

export type ActivityKind = "created" | "visit" | "accepted" | "note" | "followup" | "done" | "event" | "edited";

/** Adds one line to a contact's timeline. Never throws: history must not break the action that caused it. */
export async function logActivity(contactId: string, kind: ActivityKind, text = "") {
  await db.contactActivity.create({ data: { contactId, kind, text: text.slice(0, 300) } }).catch(() => {});
}
