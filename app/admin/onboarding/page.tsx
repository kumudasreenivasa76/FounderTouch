import Link from "next/link";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import I from "@/components/icon";
import CopyButton from "@/components/copy-button";
import { MODES, MODE_INFO } from "@/lib/modes";
import { getSettings, inviteState } from "@/lib/platform";
import { bulkInvite, createInvite, extendInvite, revokeInvite } from "../actions";
import { Flash, ago, day } from "../ui";

const MSG = {
  email: "Enter a valid email address.", exists: "That email already has an account.",
  revoked: "Invite withdrawn. The link no longer works.", extended: "Invite extended and re-opened.",
};
const STATE_TAG: Record<string, string> = { PENDING: "blue", ACCEPTED: "good", EXPIRED: "warn", REVOKED: "bad" };
const STATE_LABEL: Record<string, string> = { PENDING: "Waiting", ACCEPTED: "Joined", EXPIRED: "Expired", REVOKED: "Withdrawn" };
const PICK = MODES.filter((m) => m !== "ALL");

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ created?: string; batch?: string; made?: string; skipped?: string; ok?: string; err?: string; s?: string }> }) {
  const sp = await searchParams;
  const h = await headers();
  const origin = process.env.PUBLIC_URL?.replace(/\/$/, "") || `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const link = (token: string) => `${origin}/join/${token}`;
  const [settings, all, created] = await Promise.all([
    getSettings(),
    db.onboardingInvite.findMany({ orderBy: { createdAt: "desc" }, take: 300 }),
    sp.created ? db.onboardingInvite.findUnique({ where: { id: sp.created } }) : null,
  ]);
  const filter = sp.s ?? "all";
  const rows = all.filter((i) => filter === "all" || inviteState(i) === filter.toUpperCase());
  const counts = all.reduce<Record<string, number>>((m, i) => { const st = inviteState(i); m[st] = (m[st] ?? 0) + 1; return m; }, {});
  const batchRows = sp.batch ? all.filter((i) => i.batch === sp.batch && inviteState(i) === "PENDING") : [];
  const qr = created ? await QRCode.toDataURL(link(created.token), { margin: 1, width: 280, color: { dark: "#15171a", light: "#ffffff" } }) : "";
  const csv = batchRows.length ? "email,name,invite_link\n" + batchRows.map((i) => `${i.email},${i.name.replace(/,/g, " ")},${link(i.token)}`).join("\n") : "";

  return (
    <>
      <div className="ad-head">
        <div><h1>Onboarding</h1><p>Invite people with their card details already filled in. They choose a password and they are live.</p></div>
        <div className="ad-actions"><span className={"ad-tag " + (settings.signup === "invite" ? "ink" : "good")}>{settings.signup === "invite" ? "Invite-only sign-up" : "Open sign-up"}</span><Link className="btn ghost sm" href="/admin/settings">Change</Link></div>
      </div>
      <Flash ok={sp.ok} err={sp.err} msgs={MSG} />

      {created && (
        <div className="ad-panel" style={{ borderColor: "#cfe3d8" }}>
          <div className="ad-panel-head"><h2><I n="check-circle" size={16} /> Invite ready for {created.name || created.email}</h2><span className="muted">Works for {settings.inviteDays} days</span></div>
          <div className="ad-panel-body" style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
            <img src={qr} alt="QR code for the invite link" width={120} height={120} style={{ borderRadius: 10, border: "1px solid var(--line)" }} />
            <div style={{ flex: 1, minWidth: 260 }}>
              <p className="muted" style={{ marginTop: 0 }}>Send this link to {created.email}, or let them scan the code. The link only works for that email.</p>
              <code className="ad-link">{link(created.token)}</code>
              <div className="ad-actions" style={{ marginTop: 10 }}>
                <CopyButton text={link(created.token)} label="Copy link" />
                <a className="btn ghost" href={`mailto:${created.email}?subject=${encodeURIComponent("Your FounderTouch card is ready")}&body=${encodeURIComponent(`Hi${created.name ? " " + created.name.split(" ")[0] : ""},\n\nWe set up your FounderTouch card. Open this link to choose a password and start sharing:\n${link(created.token)}\n\nThe link works for ${settings.inviteDays} days.`)}`}><I n="mail" size={15} /> Email it</a>
              </div>
            </div>
          </div>
        </div>
      )}

      {sp.batch && (
        <div className="ad-panel">
          <div className="ad-panel-head"><h2>Import “{sp.batch}”: {sp.made} invited, {sp.skipped} skipped</h2><span className="muted">Skipped rows had a bad email, an existing account, or an open invite</span></div>
          {batchRows.length > 0 && (
            <div className="ad-panel-body">
              <p className="muted" style={{ marginTop: 0 }}>Copy these links into your email tool or a spreadsheet.</p>
              <textarea readOnly rows={Math.min(8, batchRows.length + 1)} value={csv} style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 12.5 }} />
              <div className="ad-actions"><CopyButton text={csv} label="Copy as CSV" /></div>
            </div>
          )}
        </div>
      )}

      <div className="ad-grid">
        <div className="ad-panel">
          <div className="ad-panel-head"><h2>Invite one person</h2></div>
          <form action={createInvite} className="ad-panel-body ad-form">
            <div><label className="f">Email</label><input name="email" type="email" required placeholder="name@company.com" /></div>
            <div><label className="f">Full name</label><input name="name" placeholder="Maya Iyer" /></div>
            <div><label className="f">Company</label><input name="company" placeholder="Northwind Robotics" /></div>
            <div><label className="f">Headline</label><input name="headline" placeholder="Founder" /></div>
            <div className="full">
              <label className="f">Pages to switch on</label>
              <div className="chips">{PICK.map((m) => <label key={m} className="pill"><input type="checkbox" name="modes" value={m} defaultChecked={m === "FOUNDER"} />{MODE_INFO[m].label}</label>)}</div>
            </div>
            <div><label className="f">Role</label><select name="role" defaultValue="USER"><option value="USER">Member</option><option value="ADMIN">FounderTouch team (admin)</option></select></div>
            <div><label className="f">Internal note</label><input name="note" placeholder="Met at Build Night" /></div>
            <div className="full"><button><I n="send" size={15} /> Create invite</button></div>
          </form>
        </div>

        <div className="ad-panel">
          <div className="ad-panel-head"><h2>Invite many</h2><span className="muted">Paste from a spreadsheet</span></div>
          <form action={bulkInvite} className="ad-panel-body">
            <label className="f" style={{ marginTop: 0 }}>One person per line: email, name, company, headline, pages</label>
            <textarea name="rows" rows={6} required placeholder={"maya@northwind.example, Maya Iyer, Northwind Robotics, Founder, FOUNDER\nleah@okafor.example, Leah Okafor, , Product designer, HIRE"} style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 12.5 }} />
            <label className="f">Batch name</label>
            <input name="batch" placeholder="Demo Day cohort, Nov" />
            <label className="f">Pages for rows that leave the last column empty</label>
            <div className="chips">{PICK.map((m) => <label key={m} className="pill"><input type="checkbox" name="modes" value={m} defaultChecked={m === "FOUNDER"} />{MODE_INFO[m].label}</label>)}</div>
            <button><I n="users" size={15} /> Create invites</button>
          </form>
        </div>
      </div>

      <div className="ad-panel">
        <div className="ad-bar">
          <b style={{ marginRight: 8 }}>Invites</b>
          <div className="ad-seg">
            {[["all", "All", all.length], ["pending", "Waiting", counts.PENDING ?? 0], ["accepted", "Joined", counts.ACCEPTED ?? 0], ["expired", "Expired", counts.EXPIRED ?? 0], ["revoked", "Withdrawn", counts.REVOKED ?? 0]].map(([k, l, n]) => (
              <Link key={k} href={`?s=${k}`} className={filter === k ? "on" : ""}>{l} {n}</Link>
            ))}
          </div>
        </div>
        {rows.length === 0 ? <div className="ad-empty">No invites here yet.</div> : (
          <table className="ad-table">
            <thead><tr><th>Person</th><th>Pages</th><th>Status</th><th>Batch</th><th className="num">Sent</th><th className="num">Expires</th><th /></tr></thead>
            <tbody>
              {rows.map((i) => {
                const st = inviteState(i);
                return (
                  <tr key={i.id}>
                    <td><div className="ad-who"><div><b>{i.name || i.email} {i.role === "ADMIN" && <span className="ad-tag ink">Team</span>}</b><small>{i.email}{i.company && ` · ${i.company}`}</small></div></div></td>
                    <td className="muted">{i.modes.split(",").filter(Boolean).map((m) => MODE_INFO[m as keyof typeof MODE_INFO]?.label ?? m).join(", ") || "Founder"}</td>
                    <td><span className={"ad-tag " + STATE_TAG[st]}>{STATE_LABEL[st]}</span></td>
                    <td className="muted">{i.batch}</td>
                    <td className="num muted">{ago(i.createdAt)}</td>
                    <td className="num muted">{st === "ACCEPTED" ? day(i.acceptedAt) : day(i.expiresAt)}</td>
                    <td className="num">
                      <div className="ad-actions" style={{ justifyContent: "flex-end" }}>
                        {st === "PENDING" && <CopyButton text={link(i.token)} label="Copy link" />}
                        {st === "PENDING" && <form action={revokeInvite}><input type="hidden" name="id" value={i.id} /><button className="ghost sm">Withdraw</button></form>}
                        {(st === "EXPIRED" || st === "REVOKED") && <form action={extendInvite}><input type="hidden" name="id" value={i.id} /><button className="ghost sm">Re-open</button></form>}
                        {st === "ACCEPTED" && i.acceptedUserId && <Link className="btn ghost sm" href={`/admin/users/${i.acceptedUserId}`}>View</Link>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
