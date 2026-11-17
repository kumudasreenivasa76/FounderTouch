"use client";
import { useState } from "react";

type Props = {
  action: (fd: FormData) => void | Promise<void>;
  photo: React.ReactNode;          // the tappable avatar
  cardBg: string;                  // the card's colours
  initial: { firstName: string; lastName: string; headline: string; bio: string };
  company: string;
};

const HEADLINE_MAX = 80, BIO_MAX = 240;

/** The About you editor: the card preview at the top redraws as you type, so you see the result before saving. */
export default function AboutForm({ action, photo, cardBg, initial, company }: Props) {
  const [v, setV] = useState(initial);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV((p) => ({ ...p, [k]: e.target.value }));
  const name = `${v.firstName} ${v.lastName}`.trim();
  const dirty = (Object.keys(initial) as (keyof typeof v)[]).some((k) => v[k] !== initial[k]);
  const co = company.trim();
  // A few ready headlines, built around the person's company when there is one.
  const ideas = [co ? `Founder, ${co}` : "Founder", co ? `Co-founder & CEO, ${co}` : "Co-founder & CEO", co ? `Product at ${co}` : "Product designer", co ? `Sales at ${co}` : "Independent consultant"];

  return (
    <>
      <div className="ab2-card" style={{ background: cardBg }}>
        <div className="ab2-photo">{photo}</div>
        <div className="ab2-who">
          <b>{name || "Your name"}</b>
          <span>{v.headline.trim() || "Your headline appears here"}</span>
        </div>
        <i className="ab2-live" aria-hidden>Live preview</i>
      </div>
      {v.bio.trim() && <p className="ab2-bio">{v.bio.trim()}</p>}

      <form action={action} className="card kit-form kit-lux ab2-form">
        <div className="row" style={{ marginTop: 14 }}>
          <div><label className="f" htmlFor="ab-first" style={{ marginTop: 0 }}>First name</label><input id="ab-first" name="firstName" value={v.firstName} onChange={set("firstName")} required maxLength={40} autoComplete="given-name" /></div>
          <div><label className="f" htmlFor="ab-last" style={{ marginTop: 0 }}>Last name</label><input id="ab-last" name="lastName" value={v.lastName} onChange={set("lastName")} required maxLength={40} autoComplete="family-name" /></div>
        </div>

        <label className="f" htmlFor="ab-head">Headline<em className="ab2-count">{v.headline.length}/{HEADLINE_MAX}</em></label>
        <input id="ab-head" name="headline" value={v.headline} onChange={set("headline")} maxLength={HEADLINE_MAX} placeholder="e.g. Founder & CEO, Lumen Labs" />
        <p className="kit-note">What you do, in a few words. It sits under your name everywhere.</p>
        <div className="ab2-ideas" aria-label="Headline ideas">
          {ideas.filter((x) => x !== v.headline).slice(0, 3).map((x) => <button key={x} type="button" onClick={() => setV((p) => ({ ...p, headline: x }))}>{x}</button>)}
        </div>

        <label className="f" htmlFor="ab-bio">Bio<em className="ab2-count">{v.bio.length}/{BIO_MAX}</em></label>
        <textarea id="ab-bio" name="bio" rows={4} value={v.bio} onChange={set("bio")} maxLength={BIO_MAX} placeholder="One or two lines about what you do and who it helps" />
        <p className="kit-note">Shown on your link page and full profile.</p>

        <button disabled={!dirty || !v.firstName.trim() || !v.lastName.trim()}>{dirty ? "Save changes" : "Saved"}</button>
      </form>
    </>
  );
}
