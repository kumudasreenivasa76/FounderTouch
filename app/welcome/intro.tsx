"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import Icon from "@/components/icon";

const SLIDES = [
  { img: "/intro/team.jpg", alt: "Professionals collaborating around a table", title: ["Build Your", "Professional Identity"], float: ["user", "card", "nfc", "users"],
    points: [["user", "Create a single profile"], ["grid", "Add one or more professional modes (e.g., Founder, Investor)"], ["nfc", "Share instantly with Tap, QR or link"], ["users", "Connect, collaborate and grow opportunities"]] },
  { img: "/intro/network.jpg", alt: "Founders and investors talking at a networking event", title: ["One Profile,", "Many Modes"], float: ["rocket", "coins", "store", "target"],
    points: [["rocket", "Founder: pitch deck, traction and funding need"], ["coins", "Investor: focus, cheque size and a pitch form"], ["store", "Seller: products and prices buyers can ask about"], ["target", "Recruiter: open roles and a hiring pipeline"]] },
  { img: "/intro/summit.jpg", alt: "Audience at a tech summit", title: ["Share in", "One Tap"], float: ["nfc", "qr", "link", "wallet"],
    points: [["nfc", "Tap an NFC card or phone to share"], ["qr", "Show a QR code anyone can scan"], ["link", "Send your link by text, email or WhatsApp"], ["wallet", "Add your card to Apple or Google Wallet"]] },
  { img: "/intro/team.jpg", alt: "A team working together", title: ["Connect", "and Grow"], float: ["bell", "calendar", "spark", "chat"],
    points: [["users", "Every connection saved with where you met"], ["bell", "Follow-up reminders so nobody goes cold"], ["calendar", "Run events with tickets and check-in"], ["spark", "Find deals, partners, roles and buyers"]] },
] as const;

const POS: React.CSSProperties[] = [{ left: -2, top: 40 }, { right: 0, top: 0 }, { right: -8, top: 190 }, { left: 4, top: 232 }];

export default function Intro() {
  const [i, setI] = useState(0);
  const router = useRouter();
  const touch = useRef<number | null>(null);
  const s = SLIDES[i];
  const next = () => (i < SLIDES.length - 1 ? setI(i + 1) : router.push("/signup"));
  return (
    <div role="main" id="main" className="screen d-intro"
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => { if (touch.current === null) return; const dx = e.changedTouches[0].clientX - touch.current; touch.current = null; if (dx < -60) next(); else if (dx > 60 && i > 0) setI(i - 1); }}>
      <div className="d-intro-art" key={i}>
        <img src={s.img} alt={s.alt} />
        <span className="d-intro-fade" aria-hidden />
        {s.float.map((ic, n) => <span key={n} className="d-intro-chip" style={POS[n]} aria-hidden><Icon name={ic} size={22} /></span>)}
      </div>
      <h1 aria-live="polite">{s.title[0]}<br />{s.title[1]}</h1>
      <ul className="d-intro-pts">
        {s.points.map(([ic, t]) => <li key={t}><span className="d-ico" aria-hidden style={{ width: 38, height: 38, borderRadius: 10 }}><Icon name={ic} size={19} /></span><span>{t}</span></li>)}
      </ul>
      <div className="dots" role="tablist" aria-label="Intro slides">
        {SLIDES.map((_, n) => <button key={n} type="button" role="tab" aria-selected={n === i} aria-label={`Slide ${n + 1}`} className={n === i ? "on" : ""} onClick={() => setI(n)} />)}
      </div>
      <span style={{ flex: 1 }} />
      <button type="button" className="d-next" onClick={next}>{i < SLIDES.length - 1 ? "Next" : "Create My Account"}<span className="d-bico" aria-hidden><Icon name="chev" size={18} /></span></button>
      <Link href="/signup" className="d-skip">Skip</Link>
    </div>
  );
}
