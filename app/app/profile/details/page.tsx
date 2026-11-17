import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { gradient } from "@/lib/look";
import Avatar from "@/components/avatar";
import Icon from "@/components/icon";
import PhotoUpload from "@/components/photo-upload";
import AboutForm from "@/components/about-form";
import { removePhoto, saveDetails, uploadPhoto } from "../actions";
export const dynamic = "force-dynamic";
export const metadata = { title: "About you" };

/** About you: name, photo, headline and bio, with a live preview of the card. */
export default async function Details({ searchParams }: { searchParams: Promise<{ err?: string; saved?: string }> }) {
  const sp = await searchParams;
  const { profile } = await requireOwner();
  const done = [!!profile.photo, !!profile.headline.trim(), !!profile.bio.trim()];
  const left = [!done[0] && "a photo", !done[1] && "a headline", !done[2] && "a short bio"].filter(Boolean) as string[];

  return (
    <div className="ab2">
      <Link href="/app" className="muted">← Back</Link>
      <div className="kit-lux-top share-top" style={{ marginTop: 10 }}>
        <i className="kit-lux-ic" aria-hidden><Icon name="user" size={24} /></i>
        <div>
          <b>About you</b>
          <span>How you appear on your card and pages</span>
        </div>
      </div>
      {sp.saved && <div className="ok">Saved</div>}
      {sp.err === "photo" && <div className="err">The photo must be a JPG, PNG or WebP under 5 MB.</div>}

      <AboutForm
        action={saveDetails}
        cardBg={gradient(profile.theme)}
        company={profile.company}
        initial={{ firstName: profile.firstName || profile.name.split(" ")[0] || "", lastName: profile.lastName || profile.name.split(" ").slice(1).join(" "), headline: profile.headline, bio: profile.bio }}
        photo={
          <PhotoUpload action={uploadPhoto} size={84}>
            <Avatar name={profile.name} handle={profile.handle} hasPhoto={!!profile.photo} avatar={profile.avatar} size={84} />
          </PhotoUpload>
        }
      />

      <div className="ab2-photo-row">
        <span><b>{profile.photo ? "Your photo" : "Add a photo"}</b><small>{profile.photo ? "Tap the photo on the card to change it." : "Tap the circle on the card. People remember a face. JPG, PNG or WebP, up to 5 MB."}</small></span>
        {profile.photo && <form action={removePhoto}><button className="doc-del">Remove</button></form>}
      </div>

      {left.length > 0
        ? <p className="mode-add-note">Still to add: {left.join(", ")}. A complete profile gets saved more often.</p>
        : <p className="mode-add-note">Your profile basics are complete. Next, add your <Link href="/app/profile/contact">contact details and socials</Link>.</p>}
    </div>
  );
}
