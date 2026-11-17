import { notFound } from "next/navigation";
import { MODE_INFO, modeFromSlug } from "@/lib/modes";
import { profileMeta } from "@/lib/link-page";
import Public from "../page";
export const dynamic = "force-dynamic";

type Params = Promise<{ handle: string; mode: string }>;
type Search = Promise<Record<string, string | undefined>>;

export async function generateMetadata({ params }: { params: Params }) {
  const { handle, mode } = await params;
  const m = modeFromSlug(mode);
  return profileMeta(handle, m && m !== "ALL" ? MODE_INFO[m].label : "");
}

/** Short addresses for each page: /handle/founder, /handle/investor, /handle/card and so on. */
export default async function ModePage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { handle, mode } = await params;
  const m = modeFromSlug(mode);
  if (!m) notFound();
  const sp = await searchParams;
  return <Public params={Promise.resolve({ handle })} searchParams={Promise.resolve({ ...sp, mode: m })} />;
}
