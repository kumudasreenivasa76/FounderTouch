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
      <PageHead title="Basic details" sub="Who you are. This is the top of your page and your card." saved={!!sp.saved}
        error={sp.err === "photo" ? "Photo must be JPG, PNG or WebP under 5 MB." : undefined} />

      <div className="card" style={{ textAlign: "center" }}>
        <PhotoUpload action={uploadPhoto} size={96} center>
          <Avatar name={profile.name} handle={profile.handle} hasPhoto={!!profile.photo} avatar={profile.avatar} size={96} />
        </PhotoUpload>
        <div className="muted">Tap your photo to upload one (JPG, PNG or WebP, up to 5 MB)</div>
        {profile.photo && <form action={removePhoto} style={{ marginTop: 10 }}><button className="ghost">Remove photo</button></form>}
      </div>

      <div className="card">
        <h3>Avatar</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Avatar name={profile.name} handle={profile.handle} hasPhoto={!!profile.photo} avatar={profile.avatar} size={64} flip />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="muted" style={{ marginBottom: 8 }}>{profile.photo ? "Tap the picture to flip between your photo and your avatar." : "Shown on your card and page."}</div>
            <a className="btn ghost" href="/app/profile/avatar">🎨 Design avatar</a>
          </div>
        </div>
      </div>

      <form action={saveDetails} className="card">
        <div className="row">
          <div><label className="f">First name</label><input name="firstName" defaultValue={profile.firstName} required autoComplete="given-name" /></div>
          <div><label className="f">Last name</label><input name="lastName" defaultValue={profile.lastName} required autoComplete="family-name" /></div>
        </div>
        <label className="f">Headline</label>
        <input name="headline" defaultValue={profile.headline} placeholder="e.g. Founder & CEO" />
        <label className="f">Bio</label>
        <textarea name="bio" rows={4} defaultValue={profile.bio} placeholder="What are you building, and for whom?" />
        <button>Save details</button>
      </form>
    </>
  );
}
