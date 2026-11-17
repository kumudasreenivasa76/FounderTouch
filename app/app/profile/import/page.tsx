import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import Icon from "@/components/icon";
import ProfileImport from "@/components/profile-import";
import { applyImport } from "./actions";
export const dynamic = "force-dynamic";
export const metadata = { title: "Import profile" };

/** Fill the Hire me profile from a LinkedIn data export or a resume, with a review step before anything is saved. */
export default async function ImportProfile({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const sp = await searchParams;
  const { profile } = await requireOwner();
  return (
    <div className="lk-edit">
      <Link href="/app/profile/work" className="muted">← Back</Link>
      <div className="kit-lux-top share-top" style={{ marginTop: 10 }}>
        <i className="kit-lux-ic" aria-hidden><Icon name="download" size={24} /></i>
        <div>
          <b>Import your profile</b>
          <span>From LinkedIn or a resume</span>
        </div>
      </div>
      {sp.err && <div className="err">That import could not be saved. Please try again.</div>}
      <ProfileImport apply={applyImport} hasHeadline={!!profile.headline.trim()} hasBio={!!profile.bio.trim()} />
    </div>
  );
}
