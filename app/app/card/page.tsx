import { redirect } from "next/navigation";

/** The card now lives inside Share. */
export default async function CardMoved({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  redirect(mode ? `/app?mode=${encodeURIComponent(mode)}` : "/app");
}
