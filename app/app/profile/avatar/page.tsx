import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { AVATAR_DEFAULT, parseAvatar, sanitizeAvatar } from "@/lib/look";
import Editor from "./editor";

async function save(fd: FormData) {
  "use server";
  const { profile } = await requireOwner();
  const clean = sanitizeAvatar(String(fd.get("cfg")));
  if (!clean) return;
  await db.profile.update({ where: { id: profile.id }, data: { avatar: clean } });
  revalidatePath("/app", "layout");
  redirect("/app#profile");
}

export default async function AvatarPage() {
  const { profile } = await requireOwner();
  return (
    <>
      <Link href="/app" className="muted">← Back</Link>
      <h1>Design your avatar</h1>
      <p className="muted">{profile.photo ? "Your photo shows first. Remove it in About you to show the avatar instead." : "Pick a look, tweak the details, save."}</p>
      <Editor initial={parseAvatar(profile.avatar) ?? AVATAR_DEFAULT} save={save} />
    </>
  );
}
