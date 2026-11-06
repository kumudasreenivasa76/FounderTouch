import { headers } from "next/headers";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { MODES, MODE_INFO } from "@/lib/modes";
import PageHead from "@/components/page-head";
import CopyButton from "@/components/copy-button";
import { addTag, saveTag, resetTag, deleteTag } from "./actions";
export const dynamic = "force-dynamic";
export const metadata = { title: "NFC tags" };

/** Physical NFC tags. Each tag holds one permanent link; here you choose which mode it opens. */
export default async function Nfc({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const sp = await searchParams;
  const { profile } = await requireOwner();
  const tags = await db.nfcTag.findMany({ where: { profileId: profile.id }, orderBy: { createdAt: "asc" } });
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  return (
    <>
      <PageHead title="NFC tags" sub="Write a tag once, then switch what it opens any time." back="/app" saved={!!sp.saved} />
      <p className="muted">A tag opens one mode at a time. Change the mode here and the next tap opens the new one; you never rewrite the tag.</p>
      {tags.map((t) => (
        <form key={t.id} action={saveTag} className="card">
          <input type="hidden" name="id" value={t.id} />
          <label className="f">Nickname</label>
          <input name="nickname" defaultValue={t.nickname} maxLength={40} />
          <label className="f">Opens</label>
          <select name="mode" defaultValue={t.mode}>{MODES.map((m) => <option key={m} value={m}>{MODE_INFO[m].label}</option>)}</select>
          <label className="f">If that mode is hidden</label>
          <select name="fallback" defaultValue={t.fallback}><option value="HUB">Show my main card</option><option value="UNAVAILABLE">Show "unavailable"</option></select>
          <label style={{ display: "block", margin: "8px 0" }}><input type="checkbox" name="enabled" defaultChecked={t.enabled} />Active (untick if lost)</label>
          <p className="muted" style={{ margin: "0 0 8px" }}>{t.taps} taps{t.lastTapAt ? ` · last ${t.lastTapAt.toLocaleDateString()}` : ""} · link <code>{origin}/n/{t.token}</code></p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button>Save</button>
            <CopyButton text={`${origin}/n/${t.token}`} />
            <a href={`/n/${t.token}`} target="_blank" rel="noreferrer">Test tap</a>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button formAction={resetTag} className="ghost">Reset link</button>
            <button formAction={deleteTag} className="ghost">Delete</button>
          </div>
        </form>
      ))}
      <form action={addTag} className="card">
        <label className="f">New tag nickname</label>
        <input name="nickname" placeholder="Keychain, desk card…" maxLength={40} />
        <button>Add tag</button>
      </form>
    </>
  );
}
