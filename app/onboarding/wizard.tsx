"use client";
import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import SocialPicker from "@/components/social-picker";
import PhoneField from "@/components/phone-field";
import Icon from "@/components/icon";
import { MODE_INFO, Mode } from "@/lib/modes";

function FinishBtn({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="ob-grad" disabled={pending}>
      {pending ? "Creating your page…" : count ? `Finish · ${count} page${count > 1 ? "s" : ""}` : "Finish"}
    </button>
  );
}

export default function Wizard({ firstName, lastName, finish, modes }: { firstName: string; lastName: string; finish: (fd: FormData) => void; modes: readonly string[] }) {
  const [step, setStep] = useState(0);
  const [headline, setHeadline] = useState("");
  const [company, setCompany] = useState("");
  const [bio, setBio] = useState("");
  const [tried, setTried] = useState(false);
  const [first, setFirst] = useState(firstName);
  const [lastN, setLastN] = useState(lastName);
  const [sel, setSel] = useState<string[]>(["FOUNDER"]);
  const full = `${first} ${lastN}`.trim();
  const ini = full.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
  const slugged = full.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "your-name";
  const last = 2;
  const show = (n: number) => ({ display: step === n ? "block" : "none" });
  const touch = useRef<number | null>(null);
  const next = () => {
    if (step === 0 && (!first.trim() || !lastN.trim() || !headline.trim())) { setTried(true); return; }
    setStep(step + 1);
  };
  return (
    <form action={finish} className="screen ob" style={{ display: "flex", flexDirection: "column" }}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touch.current === null) return;
        const dx = e.changedTouches[0].clientX - touch.current; touch.current = null;
        if (dx < -70 && step < last) next();
        else if (dx > 70 && step > 0) setStep(step - 1);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && step < last && (e.target as HTMLElement).tagName === "INPUT") { e.preventDefault(); next(); }
      }}>
      <div className="ob-prog">
        {["You", "About", "Pages"].map((t, i) => (
          <button key={t} type="button" className={"ob-prog-s" + (i <= step ? " on" : "")}
            onClick={() => { if (i < step) setStep(i); else if (i === step + 1) next(); }}>
            <i>{i < step ? <Icon name="check" size={12} /> : i + 1}</i>{t}
          </button>
        ))}
      </div>
      <p className="muted" style={{ textAlign: "center", margin: "-4px 0 10px" }}>Swipe or tap a step to move</p>

      <div style={show(0)} className="ob-step">
        <h1>Tell us about you</h1>
        <p className="muted">Your card builds itself as you type.</p>
        <div className="ob-card" aria-hidden>
          <span className="ob-ava">{ini || <Icon name="user" size={24} />}</span>
          <span className="ob-card-t">
            <b>{full || "Your name"}</b>
            <span>{[headline.trim(), company.trim()].filter(Boolean).join(" · ") || "Your headline"}</span>
            <span className="ob-card-cta">{MODE_INFO[(sel[0] ?? "ALL") as Mode].cta}</span>
          </span>
          <span className="ob-card-qr"><Icon name="qr" size={28} /></span>
        </div>
        <div className="row">
          <div><label className="f">First name</label><input name="firstName" value={first} onChange={(e) => setFirst(e.target.value)} autoComplete="given-name" /></div>
          <div><label className="f">Last name</label><input name="lastName" value={lastN} onChange={(e) => setLastN(e.target.value)} autoComplete="family-name" /></div>
        </div>
        <label className="f">Headline</label>
        <input name="headline" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. Founder & CEO" />
        <div className="ob-chips">
          {["Founder & CEO", "Co-founder", "Software Engineer", "Product Manager", "Designer", "Consultant"].map((s) => (
            <button key={s} type="button" className="ob-chip" onClick={() => setHeadline(s)}>{s}</button>
          ))}
        </div>
        {tried && <div className="err">Please fill in first name, last name and headline.</div>}
        <label className="f">Company name</label>
        <input name="company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Lumen Labs" />
        <label className="f">Phone</label>
        <PhoneField name="phone" />
      </div>

      <div style={show(1)} className="ob-step">
        <h1>{first.trim() ? `Nice to meet you, ${first.trim().split(/\s+/)[0]}` : "About you"}</h1>
        <p className="muted">A short bio and your links.</p>
        <div className="ob-link"><Icon name="link" size={15} /><span>Your page link:&nbsp;<b>/{slugged}</b></span></div>
        <label className="f">Short bio</label>
        <textarea name="bio" rows={3} maxLength={160} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What are you building?" />
        <p className="muted" style={{ textAlign: "right", fontSize: 12, margin: "0 2px 6px" }}>{bio.length}/160</p>
        <label className="f">Socials &amp; portfolio (optional)</label>
        <SocialPicker initial={{}} />
      </div>

      <div style={show(2)} className="ob-step">
        <h1>What describes you?</h1>
        <p className="muted">Pick the pages you want to share. Each one asks only for what it needs. You can change this anytime.</p>
        {modes.map((m) => (
          <label key={m} className="ob-mode">
            <input type="checkbox" name="modes" value={m} checked={sel.includes(m)}
              onChange={(e) => setSel(e.target.checked ? [...sel, m] : sel.filter((x) => x !== m))} />
            <span className="ob-mode-ico"><Icon mode={m} size={21} /></span>
            <span className="ob-mode-t"><b>{MODE_INFO[m as Mode].label}</b><span className="muted">{MODE_INFO[m as Mode].blurb}</span><i className="ob-cta">Button: {MODE_INFO[m as Mode].cta}</i></span>
            <span className="ob-tick"><Icon name="check" size={15} /></span>
          </label>
        ))}
        <label className="f">Booking link (Calendly / Cal.com), optional</label>
        <input name="url" type="url" placeholder="https://cal.com/you" />
      </div>

      <div style={{ marginTop: "auto", paddingTop: 16 }} className="row">
        {step > 0 && <button type="button" className="ghost" onClick={() => setStep(step - 1)}>Back</button>}
        {step < last ? <button type="button" className="ob-grad" onClick={next}>Next</button> : <FinishBtn count={sel.length} />}
      </div>
    </form>
  );
}
