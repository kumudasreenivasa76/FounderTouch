import { redirect } from "next/navigation";

/** One role's pipeline now lives in Recruiting. */
export default async function JobMoved({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/app/hire/${id}`);
}
