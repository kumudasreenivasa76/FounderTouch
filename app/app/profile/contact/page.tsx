import { requireOwner } from "@/lib/auth";
import { parseSocials } from "@/lib/socials";
import PageHead from "@/components/page-head";
import SocialPicker from "@/components/social-picker";
import { saveContact } from "../actions";
export const dynamic = "force-dynamic";

export default async function Contact({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const sp = await searchParams;
  const { profile } = await requireOwner();
  return (
    <>
      <PageHead title="Contact & socials" sub="How people reach you: phone, email, website, portfolio and socials. Shown on every mode of your page." saved={!!sp.saved} />
      <form action={saveContact} className="card">
        <label className="f">Phone / WhatsApp</label>
        <input name="phone" type="tel" defaultValue={profile.phone} placeholder="+91 98765 43210" autoComplete="tel" />
        <label className="f">Email</label>
        <input name="email" type="email" defaultValue={profile.email} placeholder="you@company.com" autoComplete="email" />
        <label className="f">Personal website</label>
        <input name="website" defaultValue={profile.website} placeholder="yourname.com" inputMode="url" autoCapitalize="none" autoComplete="url" />
        <label className="f">Socials &amp; portfolio</label>
        <SocialPicker initial={parseSocials(profile.socials)} />
        <button>Save contact &amp; socials</button>
      </form>
    </>
  );
}
