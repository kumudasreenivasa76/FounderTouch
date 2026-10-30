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
