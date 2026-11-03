# FounderTouch

A phone-style web app for sharing yourself with QR codes and NFC taps. You pick a **mode** (Founder, Investor, Seller, Service Provider, Recruiter, Hackathon, Business, Other) and people who scan see only that page.

## What's in it

- **Share**: a flip-style digital card with QR for each mode, copy/share, card image download, NFC tap writer, 7-day scan chart, per-mode settings, and a wallet of cards you've saved from others.
- **Modes and kits**: every mode has its own details and file types (decks, demos, resume, portfolio, documents). A mode is visible only once something is added to it.
- **Hire me**: experience, education, skills, resume and portfolio; recruiters can invite candidates to roles.
- **Recruiter**: post jobs, candidates apply (one tap with a FounderTouch profile, or a form), applicant pipeline, and per-job contacts.
- **Events**: branded event pages (colours, logo, cover), registration with a QR ticket, camera check-in, attendee list, project submissions, and hiring roles linked to an event.
- **Controls**: per-mode "needs my approval" gate, per-file gating, booking links (Calendly, Cal.com, Google Calendar and more) embedded in the page.

## Newer additions

- **NFC tags** (`/app/nfc`): each tag holds a permanent `/n/{token}` link; change which mode it opens any time, set a fallback, disable or reset a lost tag.
- **Connections**: a scan or form fill is a request; you accept, decline or block it. Private notes, follow-up dates and repeat-interaction counts on contacts.
- **Access control**: revoke approved file or page access; set an expiry date on any file.
- **Events**: ticket types, approval, waitlist, registration window, consent checkboxes, confirmation emails, calendar (.ics) download, staff roles, meal vouchers with vendor scanner, external links, recruiter panel that records consented conversations without creating applications.
- **Email**: set `RESEND_API_KEY` and `MAIL_FROM` to send; otherwise messages are recorded as logged. Each message is sent once per trigger, recipient and reference.
- **Flags**: `FLAGS=-event_vouchers,-transactional_email` in `.env` turns features off (all on by default).
- **Tests**: `npm test` (runs against the local dev database and cleans up).
- Not built: online payment for paid tickets, Google/Microsoft calendar sync, CRM/ATS connectors, SMS.

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
