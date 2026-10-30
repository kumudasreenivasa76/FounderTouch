import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { AVATAR_DEFAULT, parseAvatar } from "@/lib/look";
import Editor from "./editor";

async function save(fd: FormData) {
  "use server";
  const { profile } = await requireOwner();
  const cfg = String(fd.get("cfg"));
  try { JSON.parse(cfg); } catch { return; }
  await db.profile.update({ where: { id: profile.id }, data: { avatar: cfg } });
  revalidatePath("/app", "layout");
  redirect("/app/profile");
}

export default async function AvatarPage() {
  const { profile } = await requireOwner();
  return (
    <>
      <Link href="/app/profile" className="muted">← Back</Link>
      <h1>Design your avatar</h1>
      <p className="muted">{profile.photo ? "You also have a photo uploaded. The photo is shown first; remove it to show the avatar." : "Shown on your card and public page."}</p>
      <Editor initial={parseAvatar(profile.avatar) ?? AVATAR_DEFAULT} save={save} />
    </>
  );
}
