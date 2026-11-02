import { getSettings } from "@/lib/platform";
import { saveSettings } from "../actions";
import { Flash } from "../ui";

export default async function Settings({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const [s, sp] = await Promise.all([getSettings(), searchParams]);
  return (
    <>
      <div className="ad-head"><div><h1>Settings</h1><p>How people join FounderTouch, and messages to everyone.</p></div></div>
      <Flash ok={sp.ok} msgs={{ "1": "Settings saved." }} />
      <form action={saveSettings} style={{ maxWidth: 760 }}>
        <div className="ad-panel">
          <div className="ad-panel-head"><h2>Sign-up</h2></div>
          <div className="ad-panel-body">
            <label className="switch-row" style={{ cursor: "pointer" }}><span><b>Open sign-up</b><div className="muted">Anyone can create an account from the website or the mobile app.</div></span><input type="radio" name="signup" value="open" defaultChecked={s.signup === "open"} style={{ width: 18, height: 18 }} /></label>
            <label className="switch-row" style={{ cursor: "pointer" }}><span><b>Invite only</b><div className="muted">Only people with an invite link from Onboarding can join. Existing accounts are not affected.</div></span><input type="radio" name="signup" value="invite" defaultChecked={s.signup === "invite"} style={{ width: 18, height: 18 }} /></label>
            <label className="f">Allowed email domains (open sign-up only)</label>
            <input name="domains" defaultValue={s.domains} placeholder="Leave empty for any. Example: northwind.example, orbit.example" />
            <label className="f">Invite links work for (days)</label>
            <input name="inviteDays" type="number" min={1} max={90} defaultValue={s.inviteDays} style={{ maxWidth: 140 }} />
          </div>
        </div>
        <div className="ad-panel">
          <div className="ad-panel-head"><h2>Notice to everyone</h2></div>
          <div className="ad-panel-body">
            <p className="muted" style={{ marginTop: 0 }}>Shown as a quiet banner at the top of the app and the mobile app. Leave empty to show nothing.</p>
            <textarea name="notice" rows={2} maxLength={240} defaultValue={s.notice} placeholder="Example: Scheduled maintenance on Sunday, 2 to 3 am IST." />
          </div>
        </div>
        <button>Save settings</button>
      </form>
    </>
  );
}
