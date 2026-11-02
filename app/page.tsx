import Link from "next/link";
import { headers } from "next/headers";
import QRCode from "qrcode";
import I from "@/components/icon";
import { currentUser } from "@/lib/auth";
import { NavShell, Reveal, Tilt } from "@/components/site/motion";
import { CardMock, PageMock, Phone, face, photo } from "@/components/site/mocks";
import ModeShowcase from "@/components/site/modes";
import { PERSONAS } from "@/components/site/personas";
import "./site.css";

export const metadata = {
  title: "FounderTouch: one card for every room you walk into",
  description: "A digital business card with a page for every role. Share by QR, tap or link, decide who sees what, and run events and hiring from the same card.",
};

const FAQ: [string, string][] = [
  ["What is FounderTouch?", "A digital business card that opens a web page about you. Instead of one generic profile, you get a page for each role you play: founder, investor, business owner, job seeker, recruiter or hackathon builder. You choose which page each QR code or link opens."],
  ["Do people need the app to see my card?", "No. Your card opens in any phone browser. People can save you to their contacts, save your card to their own wallet if they use FounderTouch, or send their details back to you."],
  ["How does tap to share work?", "On Android phones with Chrome, FounderTouch can read NFC cards, stickers and phones that share a tap link, and write your link onto a tag. On every phone you can also send your card through the share sheet, by text, email or WhatsApp, or simply show your QR code."],
  ["Can I keep some things private?", "Yes. Any page, deck or document can require your approval. Visitors ask for access, you approve them in Contacts, and they get a private link."],
  ["Can I book meetings from my card?", "Paste a link from Calendly, Cal.com, Google Calendar appointments, Microsoft Bookings, SavvyCal, TidyCal and others. Where the service allows it, people book right on your page."],
  ["Can I use it for my company or event?", "Add your logo and brand colours to your card and page. Events get their own branded page with registration, QR tickets, camera check in at the door, an attendee list and project submissions."],
];

export default async function Home() {
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost"}`;
  const [qr, user] = await Promise.all([
    QRCode.toDataURL(`${origin}/demo`, { margin: 1, width: 360, errorCorrectionLevel: "M", color: { dark: "#15171a", light: "#ffffff" } }),
    currentUser(),
  ]);
  const maya = PERSONAS[0], leah = PERSONAS[3], dev = PERSONAS[4];
  const start = user ? { href: "/app", label: "Open the app" } : { href: "/signup", label: "Create your card" };

  return (
    <main className="s">
      <NavShell>
        <div className="s-wrap s-nav-in">
          <Link href="/" className="s-logo"><span>ft</span>FounderTouch</Link>
          <nav className="s-links" aria-label="Sections">
            <a href="#share">Sharing</a><a href="#modes">Modes</a><a href="#events">Events</a><a href="#hiring">Hiring</a><a href="#faq">FAQ</a>
          </nav>
          <div className="s-nav-cta">
            {!user && <Link href="/login" className="s-btn ghost sm">Log in</Link>}
            <Link href={start.href} className="s-btn sm">{user ? "Open app" : "Get started"}</Link>
          </div>
        </div>
      </NavShell>

      {/* Hero and the share strip together fill the first screen on a laptop */}
      <div className="s-fold">
      <section className="s-hero">
        <div className="s-hero-bg" aria-hidden />
        <div className="s-wrap s-hero-grid">
          <div className="s-hero-copy">
            <Reveal><span className="s-eyebrow"><span className="dot-live" /> Digital business card, built for many hats</span></Reveal>
            <Reveal delay={60}><h1>One card.<br />Every room you<br />walk into.</h1></Reveal>
            <Reveal delay={120}><p className="s-lead">Founder at a pitch night, candidate at a job fair, organiser at your own hackathon. FounderTouch gives you a page for each, and you decide which one people see when they scan.</p></Reveal>
            <Reveal delay={180}>
              <div className="s-cta-row">
                <Link href={start.href} className="s-btn lg">{start.label} <I n="arrow-right" size={18} /></Link>
                <a href="/demo" className="s-btn ghost lg">See a live card</a>
              </div>
            </Reveal>
            <Reveal delay={240}><p className="s-fine">Opens in any browser. Nothing for the other person to install.</p></Reveal>
          </div>

          <div className="s-hero-art">
            <Reveal delay={120} className="s-hero-phone"><Phone><PageMock p={maya} /></Phone></Reveal>
            <Reveal delay={260} className="s-hero-card"><Tilt max={14}><CardMock p={maya} qr={qr} /></Tilt></Reveal>
            <Reveal delay={420} className="s-chip s-chip-a"><span className="s-chip-ico"><I n="users" size={16} /></span><span><b>Arjun shared his details</b><small>From your Founder page, just now</small></span></Reveal>
            <Reveal delay={540} className="s-chip s-chip-b"><span className="s-chip-ico dark"><I n="qr" size={16} /></span><span><b>Scan me</b><small>It opens a real demo card</small></span></Reveal>
          </div>
        </div>
      </section>

      {/* Ways to share */}
      <section className="s-band" id="share">
        <div className="s-wrap s-ways">
          {[
            ["qr", "QR code", "With your photo in the middle and your colours around it."],
            ["nfc", "Tap", "Read and write NFC cards and stickers, or tap phones."],
            ["send", "Link", "Text, email, WhatsApp or your phone's share sheet."],
            ["scan", "Scan theirs", "Point your camera at someone's code and save their card."],
          ].map(([icon, t, d], n) => (
            <Reveal key={t} delay={n * 70} className="s-way">
              <span className="s-way-ico"><I n={icon} size={20} /></span>
              <div><b>{t}</b><p>{d}</p></div>
            </Reveal>
          ))}
        </div>
      </section>
      </div>

      {/* Modes */}
      <section className="s-dark" id="modes">
        <div className="s-wrap">
          <Reveal className="s-head center light">
            <span className="s-eyebrow light">Modes</span>
            <h2>One person. Six pages.<br />Each one asks only for what it needs.</h2>
            <p>A founder page wants your deck and traction. A Hire me page wants your resume. Turn on the modes that fit you and each QR code opens exactly the right one.</p>
          </Reveal>
          <Reveal delay={100}><ModeShowcase /></Reveal>
        </div>
      </section>

      {/* How it works */}
      <section className="s-sec">
        <div className="s-wrap">
          <Reveal className="s-head"><span className="s-eyebrow">How it works</span><h2>Set up once.<br />Share in a second.</h2></Reveal>
          <div className="s-steps">
            {[
              ["Make your card", "Name, photo or a designed avatar, your company logo and colours. Add your phone, email, website and socials."],
              ["Fill in your modes", "Each mode has its own fields and files: decks, demos, resumes, catalogs. Keep any of it behind your approval."],
              ["Share and follow up", "Show your QR, tap, or send a link. People who connect land in Contacts, and you can see scans for the last seven days."],
            ].map(([t, d], n) => (
              <Reveal key={t} delay={n * 90} className="s-step">
                <span className="s-step-n">0{n + 1}</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Story: control */}
      <section className="s-sec tight">
        <div className="s-wrap s-story">
          <Reveal className="s-story-art">
            <img className="s-photo" src={photo("1573496546038-82f9c39f6365", 1100)} alt="Two women talking and laughing by a window" />
            <div className="s-float s-float-br">
              <div className="s-req">
                <div className="s-req-top"><I n="lock" size={15} /> <b>Pitch deck</b><span>Needs approval</span></div>
                <p><b>Arjun Mehta</b> asked to view your deck</p>
                <div className="s-req-btns"><span className="s-mini dark">Approve</span><span className="s-mini">Decline</span></div>
              </div>
            </div>
          </Reveal>
          <Reveal delay={100} className="s-story-copy">
            <span className="s-eyebrow">You decide who sees what</span>
            <h2>Hand out your card freely. Keep the deck for the right people.</h2>
            <p>Put a whole page or a single file behind your approval. Visitors ask for access, you approve them in Contacts, and they get a private link of their own.</p>
            <ul className="s-ticks">
              <li><I n="check" size={16} /> Gate a full mode or just one document</li>
              <li><I n="check" size={16} /> Approvals and private links in one inbox</li>
              <li><I n="check" size={16} /> Visitors can send their details back to you</li>
            </ul>
          </Reveal>
        </div>
      </section>

      {/* Story: booking */}
      <section className="s-sec tight">
        <div className="s-wrap s-story flip">
          <Reveal className="s-story-art">
            <img className="s-photo" src={photo("1758273706077-cd89007983e8", 1100)} alt="A young woman smiling at her phone" />
            <div className="s-float s-float-tl">
              <div className="s-book">
                <div className="s-book-head"><I n="calendar" size={15} /> Book a meeting with Maya</div>
                <div className="s-book-days">{["Mon 10", "Tue 11", "Wed 12"].map((d, n) => <span key={d} className={n === 1 ? "on" : ""}>{d}</span>)}</div>
                <div className="s-book-slots">{["10:00", "11:30", "14:00", "16:30"].map((t, n) => <span key={t} className={n === 2 ? "on" : ""}>{t}</span>)}</div>
              </div>
            </div>
          </Reveal>
          <Reveal delay={100} className="s-story-copy">
            <span className="s-eyebrow">Meetings, not maybes</span>
            <h2>Turn a scan into a booked call.</h2>
            <p>Paste your scheduling link and each page gets its own call to action, like Pitch me, Get a quote or Team up. Where the service allows, people pick a slot without leaving your page.</p>
            <p className="s-small">Works with Calendly, Cal.com, Google Calendar, Microsoft Bookings, SavvyCal, TidyCal, HubSpot and more.</p>
          </Reveal>
        </div>
      </section>

      {/* Events */}
      <section className="s-sec s-soft" id="events">
        <div className="s-wrap s-story">
          <Reveal className="s-story-art">
            <img className="s-photo" src={photo("1560439514-4e9645039924", 1100)} alt="A crowd of people in a conference lobby" />
            <div className="s-float s-float-br">
              <div className="s-ticket">
                <div className="s-ticket-band"><b>Build Night Bengaluru</b><span>Sat 14 Dec · 6 pm</span></div>
                <div className="s-ticket-body">
                  <img src={qr} alt="" />
                  <div><small>Ticket for</small><b>Leah Okafor</b><span className="s-in"><I n="check-circle" size={14} /> Checked in 6:12 pm</span></div>
                </div>
              </div>
            </div>
          </Reveal>
          <Reveal delay={100} className="s-story-copy">
            <span className="s-eyebrow">Events</span>
            <h2>Run the meetup from the same card.</h2>
            <p>Create a branded event page with your colours, logo and cover. People register and get a QR ticket. At the door, your phone camera checks them in.</p>
            <ul className="s-ticks">
              <li><I n="check" size={16} /> Agenda, capacity and registration</li>
              <li><I n="check" size={16} /> Camera check in and a live attendee list</li>
              <li><I n="check" size={16} /> Project submissions for hackathons</li>
              <li><I n="check" size={16} /> Hiring roles shown right on the event page</li>
            </ul>
          </Reveal>
        </div>
      </section>

      {/* Hiring */}
      <section className="s-sec" id="hiring">
        <div className="s-wrap">
          <Reveal className="s-head center">
            <span className="s-eyebrow">Hiring, both sides</span>
            <h2>Candidates apply in one tap.<br />Recruiters keep every name.</h2>
          </Reveal>
          <div className="s-hire">
            <Reveal className="s-hire-col">
              <div className="s-hire-card">
                <div className="s-hire-who"><img src={face(leah.face, 160)} alt="" /><div><b>{leah.name}</b><span>{leah.role}</span></div><span className="s-open"><span className="dot-live" /> Open to work</span></div>
                <div className="s-hire-rows">
                  <div><I n="briefcase" size={15} /> Senior designer, Paysure <small>2021 to now</small></div>
                  <div><I n="school" size={15} /> NID Ahmedabad <small>Communication design</small></div>
                  <div><I n="file" size={15} /> Resume <small>Opens on the page</small></div>
                </div>
              </div>
              <h3>Hire me</h3>
              <p>A profile page built from your experience, education, skills and resume, with an Open to work ring on your photo.</p>
            </Reveal>
            <Reveal delay={100} className="s-hire-col">
              <div className="s-hire-card">
                <div className="s-hire-who"><img src={face(dev.face, 160)} alt="" /><div><b>Product designer</b><span>Lumen Labs · Hybrid, Bengaluru</span></div></div>
                <div className="s-pipe">
                  {[["New", 6, "#2350d8"], ["Shortlisted", 3, "#4b5059"], ["Interview", 2, "#b0661a"], ["Offer", 1, "#127a52"]].map(([l, c, col]) => (
                    <div key={l as string} className="s-pipe-col"><span style={{ background: col as string }} /><b>{c}</b><small>{l}</small></div>
                  ))}
                </div>
              </div>
              <h3>Recruiter</h3>
              <p>Post roles, accept one tap applications from FounderTouch profiles or a simple form, and move people from New to Offer.</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Bento */}
      <section className="s-sec s-soft">
        <div className="s-wrap">
          <Reveal className="s-head"><span className="s-eyebrow">The details</span><h2>Small things that make<br />a first impression stick.</h2></Reveal>
          <div className="s-bento">
            <Reveal className="s-tile wide">
              <div className="s-tile-copy"><h3>See what gets scanned</h3><p>Scans per page for the last seven days, plus taps and new contacts at a glance.</p></div>
              <div className="s-bars" aria-hidden>{[22, 38, 30, 54, 46, 70, 92].map((v, n) => <span key={n} style={{ height: `${v}%` }} className={n === 6 ? "hi" : ""} />)}</div>
            </Reveal>
            <Reveal delay={70} className="s-tile">
              <div className="s-swatches" aria-hidden>{["#2a4fc9", "#2b2e34", "#1f5f7a", "#22634c", "#6b2c4f", "#b0482a"].map((c) => <span key={c} style={{ background: c }} />)}</div>
              <h3>Your brand</h3><p>Upload your logo and pick your own two colours. They carry across the card, QR and page.</p>
            </Reveal>
            <Reveal delay={140} className="s-tile">
              <div className="s-faces" aria-hidden>{PERSONAS.slice(0, 4).map((p) => <img key={p.face} src={face(p.face, 120)} alt="" />)}</div>
              <h3>Photo or avatar</h3><p>Use a photo, design an avatar, or both. Tap your picture to flip between them.</p>
            </Reveal>
            <Reveal delay={70} className="s-tile">
              <span className="s-tile-ico"><I n="wallet" size={20} /></span>
              <h3>A wallet of people</h3><p>Save cards from pages, taps and QR codes you scan. Everyone you met, in one list.</p>
            </Reveal>
            <Reveal delay={140} className="s-tile">
              <span className="s-tile-ico"><I n="download" size={20} /></span>
              <h3>Card image</h3><p>Download your card as an image for Photos, slides or an email signature.</p>
            </Reveal>
            <Reveal delay={210} className="s-tile full">
              <span className="s-tile-ico"><I n="folder" size={20} /></span>
              <div><h3>Projects that travel</h3><p>Show what you have built with demos and code, on the modes where it matters.</p></div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Photo band */}
      <section className="s-sec tight">
        <div className="s-wrap">
          <Reveal className="s-wide">
            <img src={photo("1504384308090-c894fdcc538d", 1800)} alt="People working on laptops at a long table" />
            <div className="s-wide-copy">
              <h2>Made for the rooms where things start.</h2>
              <p>Demo days, job fairs, meetups and hackathons. Walk in with one card and leave with the right people.</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="s-sec" id="faq">
        <div className="s-wrap s-faq-grid">
          <Reveal className="s-head"><span className="s-eyebrow">FAQ</span><h2>Questions,<br />answered.</h2><p>Anything else? Make a card and look around. It takes about a minute.</p></Reveal>
          <div className="s-faq">
            {FAQ.map(([q, a], n) => (
              <Reveal key={q} delay={n * 40}>
                <details className="s-q">
                  <summary>{q}<I n="plus" size={18} /></summary>
                  <p>{a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Closing */}
      <section className="s-sec tight">
        <div className="s-wrap">
          <Reveal className="s-final">
            <div className="s-final-copy">
              <h2>Your next introduction<br />starts with a scan.</h2>
              <p>Make your card, turn on your modes and share it tonight.</p>
              <div className="s-cta-row">
                <Link href={start.href} className="s-btn lg light">{start.label} <I n="arrow-right" size={18} /></Link>
                <a href="/demo" className="s-btn lg outline">See a live card</a>
              </div>
            </div>
            <div className="s-final-art"><Tilt max={12}><CardMock p={PERSONAS[1]} /></Tilt></div>
          </Reveal>
        </div>
      </section>

      <footer className="s-foot">
        <div className="s-wrap s-foot-in">
          <div><Link href="/" className="s-logo"><span>ft</span>FounderTouch</Link><p>One card for every room you walk into.</p></div>
          <div className="s-foot-cols">
            <div><b>Product</b><a href="#share">Sharing</a><a href="#modes">Modes</a><a href="#events">Events</a><a href="#hiring">Hiring</a></div>
            <div><b>Get going</b><a href="/signup">Create a card</a><a href="/login">Log in</a><a href="/demo">Live demo</a></div>
          </div>
        </div>
        <div className="s-wrap s-foot-base"><span>© {new Date().getFullYear()} FounderTouch</span><span>Photos from Unsplash. People shown on sample cards are illustrative.</span></div>
      </footer>
    </main>
  );
}
