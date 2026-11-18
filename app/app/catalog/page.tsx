import Link from "next/link";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import PageHead from "@/components/page-head";
import Icon from "@/components/icon";
import { addProduct, deleteProduct, updateProduct } from "./actions";
export const dynamic = "force-dynamic";
export const metadata = { title: "Catalog" };

/** Seller mode: the products and prices shown on the Seller page. Inquiries arrive in Opportunities. */
export default async function Catalog({ searchParams }: { searchParams: Promise<{ saved?: string; err?: string }> }) {
  const sp = await searchParams;
  const { profile } = await requireOwner();
  const [items, leads] = await Promise.all([
    db.product.findMany({ where: { profileId: profile.id }, orderBy: [{ order: "asc" }, { createdAt: "asc" }] }),
    db.contact.count({ where: { profileId: profile.id, mode: "SERVICES", tags: { contains: "lead" } } }),
  ]);
  return (
    <div className="m-SERVICES">
      <PageHead title="Catalog" sub="Products and prices on your Seller page. Visitors can ask about each one." back="/app/more" saved={!!sp.saved}
        error={sp.err === "name" ? "Give the product a name." : sp.err === "image" ? "Use a PNG, JPG or WebP photo under 5 MB." : undefined} />
      <div className="tn-stats three">
        <div><b>{items.length}</b><span>Products</span></div>
        <Link href="/app/opportunities?f=leads"><b>{leads}</b><span>Leads</span></Link>
        <Link href={`/${profile.handle}?mode=SERVICES&pane=catalog`}><b><Icon name="link" size={18} /></b><span>View page</span></Link>
      </div>
      {items.length === 0 && <div className="card muted">No products yet. Add your first one below; it shows on your Seller page straight away.</div>}
      <div className="tn-catalog" style={{ marginBottom: 14 }}>
        {items.map((x) => (
          <div key={x.id} className="tn-product">
            <div className="img">{x.image ? <img src={`/product-img/${x.id}?v=${encodeURIComponent(x.image)}`} alt="" /> : <Icon name="store" size={28} />}</div>
            <div className="body">
              <b>{x.name}</b>
              {x.price && <span className="tn-price">{x.price}</span>}
              <details style={{ marginTop: 6 }}>
                <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Edit</summary>
                <form action={updateProduct} style={{ marginTop: 8 }}>
                  <input type="hidden" name="id" value={x.id} />
                  <input name="name" defaultValue={x.name} required maxLength={120} aria-label="Name" />
                  <input name="price" defaultValue={x.price} placeholder="Price" maxLength={60} aria-label="Price" />
                  <input name="description" defaultValue={x.description} placeholder="Short description" maxLength={300} aria-label="Description" />
                  <input name="image" type="file" accept="image/png,image/jpeg,image/webp" aria-label="Photo" />
                  <button className="sm">Save</button>
                </form>
                <form action={deleteProduct}><input type="hidden" name="id" value={x.id} /><button className="ghost sm" style={{ marginTop: 6 }}>Delete</button></form>
              </details>
            </div>
          </div>
        ))}
      </div>
      <form action={addProduct} className="card">
        <h3>Add a product or service</h3>
        <input name="name" placeholder="Name, e.g. Starter kit" required maxLength={120} />
        <input name="price" placeholder="Price, e.g. Rs 4,999 or From $40/hour" maxLength={60} />
        <input name="description" placeholder="One line about it" maxLength={300} />
        <label className="f" htmlFor="pimg">Photo (optional)</label>
        <input id="pimg" name="image" type="file" accept="image/png,image/jpeg,image/webp" />
        <button>Add to catalog</button>
      </form>
    </div>
  );
}
