import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import PageHead from "@/components/page-head";
import RoleForm from "@/components/role-form";
import { postJob } from "../actions";
export const dynamic = "force-dynamic";
export const metadata = { title: "Post a role" };

export default async function NewRole({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const sp = await searchParams;
  const { profile } = await requireOwner();
  const events = await db.event.findMany({ where: { profileId: profile.id }, orderBy: { createdAt: "desc" }, select: { id: true, name: true } });
  return (
    <>
      <PageHead title="Post a role" sub="It shows on your Recruiter page straight away. Skills you list are matched against candidates." back="/app/hire" error={sp.err ? "Give the role a title." : undefined} />
      <RoleForm action={postJob} events={events} submit="Post role" />
    </>
  );
}
