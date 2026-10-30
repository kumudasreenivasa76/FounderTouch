"use client";
import { useRef, useState } from "react";
import SocialPicker from "@/components/social-picker";
import { MODE_INFO, Mode } from "@/lib/modes";

export default function Wizard({ firstName, lastName, finish, modes }: { firstName: string; lastName: string; finish: (fd: FormData) => void; modes: readonly string[] }) {
  const [step, setStep] = useState(0);
  const [handle, setHandle] = useState("");
  const [headline, setHeadline] = useState("");
  const [tried, setTried] = useState(false);
  const [first, setFirst] = useState(firstName);
  const [lastN, setLastN] = useState(lastName);
  const full = `${first} ${lastN}`.trim();
  const last = 2;
  const show = (n: number) => ({ display: step === n ? "block" : "none" });
  const touch = useRef<number | null>(null);
  const next = () => {
    if (step === 0 && (!first.trim() || !lastN.trim() || !headline.trim())) { setTried(true); return; }
    setStep(step + 1);
  };
  return (
    <form action={finish} className="screen" style={{ display: "flex", flexDirection: "column" }}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touch.current === null) return;
        const dx = e.changedTouches[0].clientX - touch.current; touch.current = null;
        if (dx < -70 && step < last) next();
        else if (dx > 70 && step > 0) setStep(step - 1);
      }}>
      <div className="dots">{[0, 1, 2].map((i) => <i key={i} className={i <= step ? "on" : ""} />)}</div>
      <p className="muted" style={{ textAlign: "center", margin: "-8px 0 10px" }}>Step {step + 1} of 3 · swipe to move</p>

      <div style={show(0)}>
        <h1>Tell us about you</h1>
        <p className="muted">This is what people see when they scan you.</p>
        <div className="row">
          <div><label className="f">First name</label><input name="firstName" value={first} onChange={(e) => setFirst(e.target.value)} autoComplete="given-name" /></div>
          <div><label className="f">Last name</label><input name="lastName" value={lastN} onChange={(e) => setLastN(e.target.value)} autoComplete="family-name" /></div>
        </div>
        <label className="f">Headline</label>
        <input name="headline" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. Founder & CEO" />
        {tried && <div className="err">Please fill in first name, last name and headline.</div>}
        <label className="f">Company name</label>
        <input name="company" placeholder="e.g. Lumen Labs" />
        <label className="f">Phone</label>
        <input name="phone" type="tel" placeholder="+91 98765 43210" autoComplete="tel" />
      </div>

      <div style={show(1)}>
        <h1>Your public link</h1>
        <p className="muted">Pick a handle and a short bio.</p>
        <label className="f">Handle</label>
        <input name="handle" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder={full.toLowerCase().replace(/[^a-z0-9]+/g, "-")} />
        <label className="f">Short bio</label>
        <textarea name="bio" rows={3} placeholder="What are you building?" />
        <label className="f">Socials &amp; portfolio (optional)</label>
        <SocialPicker initial={{}} />
      </div>

      <div style={show(2)}>
        <h1>What describes you?</h1>
        <p className="muted">Pick the pages you want to share. Each one asks only for what it needs. You can change this anytime.</p>
        {modes.map((m) => (
          <label key={m} className="card" style={{ display: "flex", alignItems: "center", padding: 12, marginBottom: 8 }}>
            <input type="checkbox" name="modes" value={m} defaultChecked={m === "FOUNDER"} />
            <span><b>{MODE_INFO[m as Mode].icon} {MODE_INFO[m as Mode].label}</b><br /><span className="muted">{MODE_INFO[m as Mode].blurb}</span></span>
          </label>
        ))}
        <label className="f">Booking link (Calendly / Cal.com), optional</label>
        <input name="url" type="url" placeholder="https://cal.com/you" />
      </div>

      <div style={{ marginTop: "auto", paddingTop: 16 }} className="row">
        {step > 0 && <button type="button" className="ghost" onClick={() => setStep(step - 1)}>Back</button>}
        {step < last ? <button type="button" onClick={next}>Next</button> : <button type="submit">Finish</button>}
      </div>
    </form>
  );
}
