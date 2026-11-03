import { requireOwner } from "@/lib/auth";
import Avatar from "@/components/avatar";
import PageHead from "@/components/page-head";
import PhotoUpload from "@/components/photo-upload";
import { removePhoto, saveDetails, uploadPhoto } from "../actions";
export const dynamic = "force-dynamic";

export default async function Details({ searchParams }: { searchParams: Promise<{ err?: string; saved?: string }> }) {
  const sp = await searchParams;
  const { profile } = await requireOwner();
  return (
    <>
      <PageHead title="About you" sub="Your name, photo and headline, as they appear on your card." saved={!!sp.saved}
        error={sp.err === "photo" ? "Photo must be JPG, PNG or WebP under 5 MB." : undefined} />

      <div className="ab-hero">
        <PhotoUpload action={uploadPhoto} size={96} center>
          <Avatar name={profile.name} handle={profile.handle} hasPhoto={!!profile.photo} avatar={profile.avatar} size={96} />
        </PhotoUpload>
        <div className="ab-name">{profile.name}</div>
        <div className="ab-sub">{profile.headline || "Add a headline below"}</div>
        <div className="ab-hint">{profile.photo ? "Tap the photo to change it" : "Tap to add a photo"}</div>
        {profile.photo && <form action={removePhoto} style={{ marginTop: 10 }}><button className="ghost">Remove photo</button></form>}
      </div>

      <div className="ab-avatar">
        <h2>Avatar</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Avatar name={profile.name} handle={profile.handle} hasPhoto={!!profile.photo} avatar={profile.avatar} size={64} flip />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="muted" style={{ marginBottom: 8 }}>{profile.photo ? "Tap the picture to flip between photo and avatar." : "No photo? An avatar works just as well."}</div>
            <a className="btn ghost" href="/app/profile/avatar">Design avatar</a>
          </div>
        </div>
      </div>

      <form action={saveDetails} className="card kit-form ab-form">
        <h3>Details</h3>
        <div className="row">
          <div><label className="f">First name</label><input name="firstName" defaultValue={profile.firstName} required autoComplete="given-name" /></div>
          <div><label className="f">Last name</label><input name="lastName" defaultValue={profile.lastName} required autoComplete="family-name" /></div>
        </div>
        <label className="f">Headline</label>
        <input className="ab-headline" name="headline" defaultValue={profile.headline} placeholder="e.g. Founder & CEO, Lumen Labs" />
        <label className="f">Bio</label>
        <textarea name="bio" rows={4} defaultValue={profile.bio} placeholder="One or two lines about what you do and who it helps" />
        <button>Save</button>
      </form>
    </>
  );
}
