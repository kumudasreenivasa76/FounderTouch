/** The welcome-screen animation: a flat 2D phone scrolling through people's cards, with a "saved" chip popping in. Pure CSS. */
const PEOPLE = [
  { i: "AV", n: "Aisha Verma", r: "Founder · Lumen Labs", m: "Founder", g: "linear-gradient(135deg,#3b5bdb,#7048e8)" },
  { i: "RS", n: "Rahul Shetty", r: "Angel · fintech, AI", m: "Investor", g: "linear-gradient(135deg,#0ca678,#1098ad)" },
  { i: "MI", n: "Meera Iyer", r: "Brand designer", m: "Services", g: "linear-gradient(135deg,#d6336c,#9c36b5)" },
  { i: "DK", n: "Dev Kapoor", r: "Tech recruiter", m: "Recruiter", g: "linear-gradient(135deg,#f76707,#e03131)" },
  { i: "SK", n: "Sana Khan", r: "Product engineer", m: "Open to work", g: "linear-gradient(135deg,#1c7ed6,#0b7285)" },
  { i: "AR", n: "Arjun Rao", r: "Founder · Nivaan", m: "Founder", g: "linear-gradient(135deg,#7048e8,#9c36b5)" },
];

export default function HeroCards() {
  const rows = [...PEOPLE, ...PEOPLE]; // doubled for a seamless loop
  return (
    <div className="mock-wrap" aria-hidden>
      <div className="back-card b1">
        <div className="bc-in bc-card" style={{ background: "linear-gradient(135deg,#0ca678,#1098ad)" }}>
          <span className="bc-ava">RS</span>
          <span className="bc-id"><b>Rahul Shetty</b><i>Angel investor</i></span>
          <span className="bc-qr"><svg viewBox="0 0 12 12" width="100%" height="100%"><g fill="#1c2330"><rect x="1" y="1" width="4" height="4" /><rect x="7" y="1" width="4" height="4" /><rect x="1" y="7" width="4" height="4" /><rect x="7" y="7" width="2" height="2" /><rect x="10" y="9" width="1" height="2" /></g></svg></span>
        </div>
      </div>
      <div className="back-card b2">
        <div className="bc-in bc-card" style={{ background: "linear-gradient(135deg,#d6336c,#9c36b5)", animationDelay: ".9s" }}>
          <span className="bc-ava">MI</span>
          <span className="bc-id"><b>Meera Iyer</b><i>Brand designer</i></span>
          <span className="bc-qr"><svg viewBox="0 0 12 12" width="100%" height="100%"><g fill="#1c2330"><rect x="1" y="1" width="4" height="4" /><rect x="7" y="1" width="4" height="4" /><rect x="1" y="7" width="4" height="4" /><rect x="7" y="7" width="2" height="2" /><rect x="10" y="9" width="1" height="2" /></g></svg></span>
        </div>
      </div>
      <div className="back-card b3">
        <div className="bc-in bc-prof" style={{ animationDelay: "1.6s" }}>
          <span className="mp-ava" style={{ background: "linear-gradient(135deg,#3b5bdb,#7048e8)" }}>AV</span>
          <span className="mp-id"><b>Aisha Verma</b><i>Founder · Lumen Labs</i></span>
          <span className="mp-pill">Founder</span>
        </div>
      </div>
      <span className="float-tag ft1">
        <i className="ft-ico" style={{ background: "linear-gradient(135deg,#3b5bdb,#7048e8)" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="6" width="18" height="13" rx="3" /><path d="M7 11h6M7 14.5h4" /></svg>
        </i>Cards
      </span>
      <span className="float-tag ft2">
        <i className="ft-ico" style={{ background: "linear-gradient(135deg,#9c36b5,#7048e8)" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></svg>
        </i>Modes
      </span>
      <span className="float-tag ft3">
        <i className="ft-ico" style={{ background: "linear-gradient(135deg,#0ca678,#1098ad)" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="9" cy="14" r="1.6" fill="currentColor" stroke="none" /><path d="M12.5 10.5a5 5 0 0 1 1.5 3.5M15.5 7.5a9 9 0 0 1 2.5 6" /></svg>
        </i>Tap
      </span>
      <span className="float-tag ft4">
        <i className="ft-ico" style={{ background: "linear-gradient(135deg,#f76707,#e03131)" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V4M8 7.5 12 4l4 3.5" /><path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></svg>
        </i>Share
      </span>
      <div className="mock-phone">
        <div className="mock-top">TapNodd</div>
        <div className="mock-view">
          <div className="mock-scroll">
            {rows.map((p, i) => (
              <div className="mp-row" key={i}>
                <span className="mp-ava" style={{ background: p.g }}>{p.i}</span>
                <span className="mp-id"><b>{p.n}</b><i>{p.r}</i></span>
                <span className="mp-pill">{p.m}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="hc-chip">
        <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="8" fill="#1f9d55" /><path d="M4.5 8.2 7 10.7l4.5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
        Saved to contacts
      </div>
    </div>
  );
}
