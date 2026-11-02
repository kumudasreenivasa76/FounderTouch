# FounderTouch

A phone-style web app for sharing yourself with QR codes and NFC taps. You pick a **mode** (Founder, Investor, Seller, Service Provider, Recruiter, Hackathon, Business, Other) and people who scan see only that page.

## What's in it

- **Share**: a flip-style digital card with QR for each mode, copy/share, card image download, NFC tap writer, 7-day scan chart, per-mode settings, and a wallet of cards you've saved from others.
- **Modes and kits**: every mode has its own details and file types (decks, demos, resume, portfolio, documents). A mode is visible only once something is added to it.
- **Hire me**: experience, education, skills, resume and portfolio; recruiters can invite candidates to roles.
- **Recruiter**: post jobs, candidates apply (one tap with a FounderTouch profile, or a form), applicant pipeline, and per-job contacts.
- **Events**: branded event pages (colours, logo, cover), registration with a QR ticket, camera check-in, attendee list, project submissions, and hiring roles linked to an event.
- **Controls**: per-mode "needs my approval" gate, per-file gating, booking links (Calendly, Cal.com, Google Calendar and more) embedded in the page.

## Run it

```bash
npm install
cp .env.example .env        # defaults to a local SQLite file
npm run db                  # creates the database and seeds a demo account
npm run dev                 # http://localhost:4400
```

Demo login: `demo@founder.example` / `demo1234`
FounderTouch team (admin) login: `admin@foundertouch.example` / `admin1234`

Optional: `npm run sample` adds fictional people, scans, contacts, an event and a job so every screen has something to show.

## Admin console (`/admin`)

For the FounderTouch team. Only accounts with the admin role can open it; team members land there after logging in.

- **Overview**: accounts, weekly actives, cards set up, scans and sign-ups over 30 days, most-scanned people, team activity.
- **Users**: search and filter, then per user: card summary, modes, signed-in devices, suspend or restore, add to the team, sign out everywhere, delete (type the email to confirm). Suspending ends every session and hides their card.
- **Onboarding**: invite one person or paste a list from a spreadsheet. Each invite carries the name, company, headline and pages to switch on, so the card is ready the moment they choose a password. Links (`/join/<token>`) work only for the invited email, expire after the set number of days, and can be withdrawn or re-opened.
- **Events, Hiring, Content**: everything across the platform, with close, reopen and remove.
- **Audit log**: every change the team makes.
- **Settings**: open or invite-only sign-up, allowed email domains, invite lifetime, and a notice banner shown in the app and mobile app.

## Mobile app (`mobile/`)

An Expo (React Native) app for iOS and Android that talks to this server through the JSON API in `app/api/v1` (token auth). The contract is in [docs/mobile-api.md](docs/mobile-api.md); how to run and build it is in `mobile/README.md`.

## Stack

Next.js 15 (App Router, server actions) · React 19 · Prisma 6 · SQLite · TypeScript. QR codes with `qrcode`, ticket scanning with `jsqr`.

## Optional: Google Wallet

"Add to Google Wallet" needs your own Google Wallet API account. Set these in `.env`:

```
GOOGLE_WALLET_ISSUER_ID=
GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL=
GOOGLE_WALLET_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Apple Wallet passes need a paid Apple Developer certificate and are not implemented.

## Notes

- Uploaded files go to `uploads/` (not committed). Photos, decks and resumes are served through the app.
- NFC writing works in Chrome on Android over HTTPS. The check-in camera needs HTTPS or localhost.
- This is a prototype: there is no automatic email sending yet, so approval and access links are shared by the owner.
