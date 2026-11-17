import { profileMeta } from "@/lib/link-page";
import LinkPage from "@/components/link-page";
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  return profileMeta((await params).handle, "Links");
}

/** The same link page that /handle shows, kept at /handle/links so older shared addresses still work. */
export default async function Links({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return <LinkPage handle={handle} />;
}
