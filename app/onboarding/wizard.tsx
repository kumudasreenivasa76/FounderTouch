"use client";
import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import PhoneField from "@/components/phone-field";
import Icon from "@/components/icon";
import { SocialIcon } from "@/components/social-icon";
import { SOCIALS } from "@/lib/socials";
import { MODE_INFO, Mode } from "@/lib/modes";

/** Design 5–9: Choose modes, then four numbered steps: Socials, Company, About you, Kits. */
const ROLES = ["Founder & CEO", "Co-founder", "CTO", "Investor", "Partner", "Product Manager", "Engineer", "Designer", "Recruiter", "Consultant", "Sales"];
const INDUSTRIES = ["AI & Data", "HealthTech", "FinTech", "EdTech", "Climate & Energy", "Manufacturing", "Retail & E-commerce", "SaaS", "Media", "Consulting", "Other"];
const SIZES = ["Just me", "1 – 10", "11 – 50", "51 – 200", "201 – 1,000", "1,000+"];
const MODE_ICON: Record<string, string> = { FOUNDER: "rocket", INVESTOR: "coins", SERVICES: "store", RECRUITER: "target", OTHER: "spark" };
const KITS: { mode: string; title: string; sub: string; icon: string }[] = [
  { mode: "FOUNDER", title: "Pitch Kit", sub: "For investors & accelerators", icon: "rocket" },
  { mode: "INVESTOR", title: "Investor Kit", sub: "For fundraising & updates", icon: "coins" },
  { mode: "SERVICES", title: "Product Kit", sub: "For customers & partners", icon: "store" },
  { mode: "RECRUITER", title: "Hiring Kit", sub: "For candidates & job fairs", icon: "target" },
  { mode: "NORMAL", title: "Company Kit", sub: "For media & events", icon: "building" },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="d-ob-f"><span className="d-ob-l">{label}</span>{children}</div>;
}

function FinishBtn() {
  const { pending } = useFormStatus();
  return <button type="submit" className="d-next" disabled={pending}>{pending ? "Creating your card…" : "Finish Setup"}<span className="d-bico" aria-hidden><Icon name="chev" size={18} /></span></button>;
}

export default function Wizard({ firstName, lastName, email, finish, modes }: { firstName: string; lastName: string; email: string; finish: (fd: FormData) => void; modes: readonly string[] }) {
  const [step, setStep] = useState(0); // 0 = modes, 1..4 = numbered steps
  const [sel, setSel] = useState<string[]>(["FOUNDER"]);
  const [kits, setKits] = useState<string[]>(["FOUNDER"]);
  const [links, setLinks] = useState<string[]>(["linkedin", "github", "x"]);
  const [adding, setAdding] = useState(false);
  const [first, setFirst] = useState(firstName);
  const [lastN, setLastN] = useState(lastName);
  const [headline, setHeadline] = useState("");
  const [company, setCompany] = useState("");
  const [bio, setBio] = useState("");
  const [err, setErr] = useState("");
  const touch = useRef<number | null>(null);
  const pickable = modes.filter((m) => m !== "NORMAL");

  const next = () => {
    if (step === 0 && sel.length === 0) { setErr("Pick at least one mode. You can change it later."); return; }
    if (step === 3 && (!first.trim() || !lastN.trim() || !headline.trim())) { setErr("Add your first name, last name and role."); return; }
    setErr("");
    setStep(step + 1);
    if (step === 0) setKits(KITS.filter((k) => sel.includes(k.mode)).map((k) => k.mode));
  };
  const show = (n: number) => ({ display: step === n ? "flex" : "none" });
  const toggle = (arr: string[], set: (v: string[]) => void, v: string) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <form action={finish} className="screen ob d-ob"
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => { if (touch.current === null) return; const dx = e.changedTouches[0].clientX - touch.current; touch.current = null; if (dx < -70 && step < 4) next(); else if (dx > 70 && step > 0) setStep(step - 1); }}
      onKeyDown={(e) => { if (e.key === "Enter" && step < 4 && (e.target as HTMLElement).tagName === "INPUT") { e.preventDefault(); next(); } }}>
      <div className="d-ob-top">
        {step > 0 ? <button type="button" className="d-ibtn" aria-label="Back" onClick={() => setStep(step - 1)}><Icon name="back" size={24} /></button> : <span style={{ height: 40 }} />}
      </div>
      {step > 0 && (
        <div className="d-step" aria-live="polite">
          <span>Step {step} of 4</span>
          <div className="d-bar" role="progressbar" aria-label="Setup progress" aria-valuemin={1} aria-valuemax={4} aria-valuenow={step}><i style={{ width: `${step * 25}%` }} /></div>
        </div>
      )}

      {/* Choose modes (design 5) */}
      <section style={show(0)} className="d-ob-s">
        <h1>Choose Your Mode(s)<sup>™</sup></h1>
        <p className="d-ob-p">Select one or more modes. You can add or change them anytime.</p>
        {pickable.map((m) => (
          <label key={m} className={"d-pick" + (sel.includes(m) ? " on" : "")}>
            <input type="checkbox" name="modes" value={m} checked={sel.includes(m)} onChange={() => toggle(sel, setSel, m)} />
            <span className="d-ico" aria-hidden style={{ width: 46, height: 46 }}><Icon name={MODE_ICON[m] ?? "spark"} size={22} /></span>
            <span className="d-grow"><b>{MODE_INFO[m as Mode].label === "Services" ? "Seller" : MODE_INFO[m as Mode].label}</b><span>{MODE_INFO[m as Mode].blurb}</span></span>
            <span className="d-box" aria-hidden><Icon name="check" size={15} /></span>
          </label>
        ))}
      </section>

      {/* Step 1: socials (design 6) */}
      <section style={show(1)} className="d-ob-s">
        <h1>Let&apos;s Build Socials</h1>
        <Field label="Phone Number"><PhoneField name="phone" /></Field>
        <Field label="Email"><input name="email" type="email" defaultValue={email} placeholder="Email" aria-label="Email" /></Field>
        <Field label="Website"><label className="d-field"><Icon name="globe" size={18} /><span className="sr-only">Website</span><input name="website" type="url" inputMode="url" placeholder="Website" /></label></Field>
        <Field label="Social Links">
          {links.map((k) => {
            const s = SOCIALS.find((x) => x.key === k)!;
            return <label key={k} className="d-field"><SocialIcon k={k} size={18} /><span className="sr-only">{s.label}</span><input name={"social_" + k} placeholder={s.label.replace(" (Twitter)", "")} inputMode="url" autoCapitalize="none" /></label>;
          })}
          {adding
            ? <div className="d-chips" style={{ flexWrap: "wrap" }}>{SOCIALS.filter((x) => !links.includes(x.key)).map((x) => <button key={x.key} type="button" onClick={() => { setLinks([...links, x.key]); setAdding(false); }}>{x.label.replace(" (Twitter)", "")}</button>)}</div>
            : links.length < SOCIALS.length && <button type="button" className="d-soft" onClick={() => setAdding(true)}><span className="d-pl" aria-hidden><Icon name="plus" size={15} /></span>Add Another Link</button>}
        </Field>
      </section>

      {/* Step 2: company (design 7) */}
      <section style={show(2)} className="d-ob-s">
        <h1>Company Details</h1>
        <Field label="Company Name"><input name="company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company Name" aria-label="Company name" /></Field>
        <Field label="Your Role">
          <input name="headline" list="ob-roles" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. Founder & CEO" aria-label="Your role" />
          <datalist id="ob-roles">{ROLES.map((r) => <option key={r} value={r} />)}</datalist>
        </Field>
        <Field label="Industry"><select name="industry" defaultValue="" aria-label="Industry"><option value="">Choose an industry</option>{INDUSTRIES.map((x) => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Company Website"><label className="d-field"><Icon name="globe" size={18} /><span className="sr-only">Company website</span><input name="companyWebsite" type="url" inputMode="url" placeholder="Company Website" /></label></Field>
        <Field label="Company Size"><select name="companySize" defaultValue="" aria-label="Company size"><option value="">Choose a size</option>{SIZES.map((x) => <option key={x}>{x}</option>)}</select></Field>
      </section>

      {/* Step 3: about you */}
      <section style={show(3)} className="d-ob-s">
        <h1>About You</h1>
        <div className="d-two">
          <Field label="First Name"><input name="firstName" value={first} onChange={(e) => setFirst(e.target.value)} autoComplete="given-name" aria-label="First name" /></Field>
          <Field label="Last Name"><input name="lastName" value={lastN} onChange={(e) => setLastN(e.target.value)} autoComplete="family-name" aria-label="Last name" /></Field>
        </div>
        <Field label="Headline"><input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. Founder & CEO" aria-label="Headline" /></Field>
        <div className="d-chips" style={{ flexWrap: "wrap" }}>{ROLES.slice(0, 6).map((r) => <button key={r} type="button" className={headline === r ? "on" : ""} onClick={() => setHeadline(r)}>{r}</button>)}</div>
        <Field label="Short Bio"><textarea name="bio" rows={3} maxLength={160} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What are you building?" aria-label="Short bio" /></Field>
        <span className="d-t2" style={{ textAlign: "right" }}>{bio.length}/160</span>
        <Field label="Booking Link (optional)"><input name="url" type="url" placeholder="https://cal.com/you" aria-label="Booking link" /></Field>
      </section>

      {/* Step 4: kits (design 9) */}
      <section style={show(4)} className="d-ob-s">
        <h1>Kits &amp; Preferences</h1>
        <p className="d-ob-p">Which kits do you want to create?</p>
        {KITS.map((k) => (
          <label key={k.mode} className={"d-pick" + (kits.includes(k.mode) ? " on" : "")}>
            <input type="checkbox" name="kits" value={k.mode} checked={kits.includes(k.mode)} onChange={() => toggle(kits, setKits, k.mode)} />
            <span className="d-ico" aria-hidden style={{ width: 44, height: 44 }}><Icon name={k.icon} size={21} /></span>
            <span className="d-grow"><b>{k.title}</b><span>{k.sub}</span></span>
            <span className="d-box" aria-hidden><Icon name="check" size={15} /></span>
          </label>
        ))}
        <p className="d-t2" style={{ margin: "2px 0 0" }}>Each kit is a page of documents, decks and links you can share. Add a custom kit any time from Profile › Kits.</p>
      </section>

      {err && <div className="err" role="alert">{err}</div>}
      <div style={{ marginTop: "auto", paddingTop: 16 }}>
        {step < 4
          ? <button type="button" className="d-next" onClick={next}>{step === 0 ? "Continue" : "Next"}<span className="d-bico" aria-hidden><Icon name="chev" size={18} /></span></button>
          : <FinishBtn />}
      </div>
    </form>
  );
}
