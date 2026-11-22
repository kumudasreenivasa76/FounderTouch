import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { parseSocials } from "@/lib/socials";
import Icon from "@/components/icon";
import SocialList from "@/components/social-list";
import PhoneField from "@/components/phone-field";
import { saveContact } from "../actions";
import BackLink from "@/components/back-link";
export const dynamic = "force-dynamic";
export const metadata = { title: "Contact & socials" };

/** Contact and socials: how people reach you. The same details appear on every page you share. */
export default async function Contact({ searchParams }: { searchParams: Promise<{ saved?: string; err?: string }> }) {
  const sp = await searchParams;
  const { profile } = await requireOwner();
  return (
    <div className="ct">
      <BackLink href="/app" />
      <div className="kit-lux-top share-top" style={{ marginTop: 10 }}>
        <i className="kit-lux-ic" aria-hidden><Icon name="phone" size={24} /></i>
        <div>
          <b>Contact and socials</b>
          <span>How people reach you, on every page you share</span>
        </div>
      </div>
      {sp.saved && <div className="ok">Saved</div>}
      {sp.err === "email" && <div className="err">That email address does not look right. Check it and save again.</div>}

      <form action={saveContact} className="card kit-form kit-lux ct-form">
        <div className="kit-group" style={{ marginTop: 12 }}>
          <b className="kit-group-t">Reach me</b>
          <label className="f ct-lbl" htmlFor="ct-phone"><Icon name="phone" size={15} />Phone or WhatsApp</label>
          <PhoneField name="phone" defaultValue={profile.phone} id="ct-phone" />
          <label className="f ct-lbl" htmlFor="ct-email"><Icon name="mail" size={15} />Email</label>
          <input id="ct-email" name="email" type="email" defaultValue={profile.email} placeholder="you@company.com" autoComplete="email" maxLength={120} />
          <label className="f ct-lbl" htmlFor="ct-web"><Icon name="globe" size={15} />Website</label>
          <input id="ct-web" name="website" defaultValue={profile.website.replace(/^https?:\/\//, "")} placeholder="yourname.com" inputMode="url" autoCapitalize="none" autoComplete="url" maxLength={200} />
          <p className="kit-note">These go on your card and into the contact file people save.</p>
        </div>

        <div className="kit-group">
          <SocialList initial={parseSocials(profile.socials)} />
        </div>

        <button>Save contact and socials</button>
      </form>
      <p className="mode-add-note">Want extra buttons such as "Book a call"? Add them on your <Link href="/app/links">link page</Link>.</p>
    </div>
  );
}
