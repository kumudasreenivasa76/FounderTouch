"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";

export async function sendMessage(fd: FormData) {
  const { profile } = await requireOwner();
  const id = String(fd.get("id")), body = String(fd.get("body") ?? "").trim().slice(0, 2000);
  const c = await db.conversation.findUnique({ where: { id } });
  if (!c || (c.aId !== profile.id && c.bId !== profile.id)) redirect("/app/messages");
  if (body) {
    await db.message.create({ data: { conversationId: id, senderId: profile.id, body } });
    await db.conversation.update({ where: { id }, data: { subject: c.subject || body.slice(0, 60) } });
  }
  revalidatePath(`/app/messages/${id}`);
  redirect(`/app/messages/${id}#end`);
}
