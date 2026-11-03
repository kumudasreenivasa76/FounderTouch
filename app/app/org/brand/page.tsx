import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/auth";
import { membership } from "@/lib/org";
import PageHead from "@/components/page-head";
import OrgNav from "@/components/org-nav";
import { saveBrandKit, pushBrand } from "../actions";
export const dynamic = "force-dynamic";
export const metadata = { title: "Brand kit" };

/** Central brand: logo, colours, company name, a lock, and the banner added to every email signature. */
export default async function Brand({ searchParams }: { searchParams: Promise<{ saved?: string; err?: string }> }) {
  const sp = await searchParams;
  const { user } = await requireOwner();
  const m = await membership(user.id);
  if (!m || !m.isAdmin) notFound();
  const o = m.org;
  return (
    <>
      <PageHead title="Brand kit" sub="One look for every card, signature and video background." back="/app/org" saved={!!sp.saved} error={sp.err === "logo" ? "The logo must be a PNG, JPG or WebP under 2 MB." : undefined} />
      <OrgNav active="brand" isAdmin />
      <form action={saveBrandKit} className="card" encType="multipart/form-data">
        <label className="f" htmlFor="b-name">Team name</label>
        <input id="b-name" name="name" defaultValue={o.name} required maxLength={80} />
        <label className="f" htmlFor="b-co">Company shown on cards</label>
        <input id="b-co" name="company" defaultValue={o.company} maxLength={80} />
        <div className="row">
          <div><label className="f" htmlFor="b-c1">Colour 1</label><input id="b-c1" name="color1" type="color" defaultValue={o.color1 || "#3b5bdb"} style={{ height: 44, padding: 4 }} /></div>
          <div><label className="f" htmlFor="b-c2">Colour 2</label><input id="b-c2" name="color2" type="color" defaultValue={o.color2 || "#7048e8"} style={{ height: 44, padding: 4 }} /></div>
        </div>
        <label className="f" htmlFor="b-logo">Logo (PNG, JPG or WebP, under 2 MB)</label>
        <input id="b-logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp" />
        {o.logo && <label style={{ display: "block", margin: "4px 0 8px" }}><input type="checkbox" name="rm_logo" />Remove current logo</label>}
        <label className="f" htmlFor="b-bt">Email signature banner (optional)</label>
        <input id="b-bt" name="bannerText" defaultValue={o.bannerText} maxLength={120} placeholder="e.g. Meet us at Expo 2026, stand 14" />
        <label className="f" htmlFor="b-bu">Banner link (https)</label>
        <input id="b-bu" name="bannerUrl" defaultValue={o.bannerUrl} inputMode="url" placeholder="https://" />
        <label style={{ display: "block", margin: "10px 0 4px" }}><input type="checkbox" name="lock" defaultChecked={o.brandLocked} /><b>Lock the brand</b></label>
        <p className="muted" style={{ marginTop: 0 }}>Members can no longer change their card colours, company name or logo.</p>
        <label style={{ display: "block", margin: "4px 0 10px" }}><input type="checkbox" name="apply" />Apply to everyone on the team now</label>
        <button>Save brand kit</button>
      </form>
      <form action={pushBrand} className="card">
        <b>Re-apply the saved brand</b>
        <p className="muted">Pushes the colours, company name and logo above to every member&apos;s card again, for example after someone changed theirs before you locked it.</p>
        <button className="ghost">Apply to all members</button>
      </form>
    </>
  );
}
