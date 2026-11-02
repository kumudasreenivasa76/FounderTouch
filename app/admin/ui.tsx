/** Small shared pieces for the admin console. */

export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";

export function Ava({ name, photo, handle }: { name: string; photo?: string; handle?: string }) {
  return photo && handle
    ? <img className="ad-ava" src={`/photo/${handle}?v=${encodeURIComponent(photo)}`} alt="" />
    : <span className="ad-ava">{initials(name)}</span>;
}

export function ago(d: Date | null | undefined) {
  if (!d) return "never";
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} d ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export const day = (d: Date | null | undefined) => (d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");

/** Counts per day for the last `n` days, oldest first. */
export function perDay(dates: Date[], n: number) {
  const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (n - 1));
  const out = Array(n).fill(0);
  for (const d of dates) { const i = Math.floor((d.getTime() - start.getTime()) / 86400000); if (i >= 0 && i < n) out[i]++; }
  return { counts: out, start };
}

export function Chart({ counts, start, label }: { counts: number[]; start: Date; label: string }) {
  const max = Math.max(1, ...counts);
  const end = new Date(start); end.setDate(end.getDate() + counts.length - 1);
  return (
    <>
      <div className="ad-chart" role="img" aria-label={`${label}: ${counts.reduce((a, b) => a + b, 0)} in ${counts.length} days`}>
        {counts.map((c, i) => <span key={i} className={i === counts.length - 1 ? "hi" : ""} style={{ height: `${(c / max) * 100}%` }} title={`${c}`} />)}
      </div>
      <div className="ad-chart-l"><span>{day(start)}</span><span>Today</span></div>
    </>
  );
}

export function Flash({ ok, err, msgs }: { ok?: string; err?: string; msgs: Record<string, string> }) {
  const text = (ok && msgs[ok]) || (err && msgs[err]);
  if (!text) return null;
  return <div className={err ? "err" : "ok"}>{text}</div>;
}

export const userStatusTag = (status: string) => <span className={"ad-tag " + (status === "ACTIVE" ? "good" : "bad")}>{status === "ACTIVE" ? "Active" : "Suspended"}</span>;

const ACTION_LABEL: Record<string, string> = {
  "user.suspend": "suspended", "user.restore": "restored", "user.make_admin": "made an admin:", "user.remove_admin": "removed admin from",
  "user.sign_out_all": "signed out everywhere", "user.revoke_session": "ended a session for", "user.delete": "deleted the account",
  "invite.create": "invited", "invite.bulk": "imported invites:", "invite.revoke": "withdrew the invite for", "invite.extend": "extended the invite for",
  "event.close": "closed the event", "event.reopen": "reopened the event", "job.close": "closed the role", "job.reopen": "reopened the role",
  "content.remove": "removed", "settings.save": "changed settings:",
};
export const actionLabel = (a: string) => ACTION_LABEL[a] ?? a;

