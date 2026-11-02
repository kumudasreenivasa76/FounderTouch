# FounderTouch mobile API (v1)

Base URL: `<server>/api/v1` (local: `http://localhost:4401/api/v1`). JSON in, JSON out.

Auth: log in or sign up to get a `token`, then send `Authorization: Bearer <token>` on every call.
Errors come back as `{ "error": "<code>", "message": "<text to show the user>" }` with a 4xx/5xx status.
`401` means the token is gone (log out locally). `409 no_profile` means the user must finish set-up (`POST /me/profile`).

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/` | | `{ name, version }` health check |
| POST | `/auth/login` | `{ email, password, device }` | `{ token }`; 401 `bad_login`, 403 `suspended` |
| POST | `/auth/signup` | `{ firstName, lastName, email, password, invite?, device }` | 201 `{ token, hasProfile }`; 400/409 with message (invite-only, domain, exists…) |
| POST | `/auth/logout` | | `{ ok }` |
| GET | `/me` | | `{ user: { id, email, name, firstName, lastName, role }, profile: null \| { handle, name, firstName, lastName, headline, company, bio, phone, email, website, socials: {linkedin?,x?,instagram?,github?,youtube?,facebook?,telegram?,portfolio?,whatsapp?}, byline, photoUrl, pageUrl, openTo, skills }, notice: string \| null }` |
| POST | `/me/profile` | `{ firstName, lastName, handle?, headline, company?, bio?, phone?, socials?, modes: string[] }` | 201 `{ handle }` first-time set-up |
| PATCH | `/me/profile` | any of `firstName, lastName, headline, company, bio, phone, email, website, socials` | `{ ok }` |
| GET | `/card` | | `{ name, byline, handle, photoUrl, theme: { from, to, name }, lines: [{ icon: "phone"\|"mail"\|"globe", text }], modes: [{ mode, label, icon, blurb, enabled, needsApproval, url, pageUrl, qr: dataURL \| null, scans, days: number[7] }], stats: { scans, taps, contacts, saved }, cardImageUrl }` |
| PATCH | `/modes/:mode` | `{ enabled?, needsApproval? }` | `{ ok }` (ALL cannot be switched off) |
| GET | `/contacts` | | `{ people: [{ id, name, email, company, linkedin, via, at }], requests: [{ id, kind: "deck"\|"mode", name, email, what, note?, at }], applicants: [{ id, name, email, job, status, statusLabel, at }] }` |
| POST | `/requests/:id` | `{ kind: "deck"\|"mode", status: "APPROVED"\|"DECLINED" }` | `{ ok }` |
| POST | `/peek` | `{ code }` (scanned QR text) | `{ kind: "card", handle, name, byline, mode, modeLabel, photoUrl, pageUrl, own, saved, theme: { from, to } }` or `{ kind: "other", text }`; 404 if a dead code |
| GET | `/wallet` | | `{ cards: [{ id, handle, name, byline, mode, modeLabel, photoUrl, pageUrl, at, theme: { from, to } }] }` |
| POST | `/wallet` | `{ handle, mode }` | 201 `{ ok }`; 400 `own` |
| DELETE | `/wallet/:id` | | `{ ok }` |
| GET | `/events` | | `{ events: [{ id, name, location, startsAt, endsAt, open, capacity, color, color2, pageUrl, registered, checkedIn, projects }] }` |
| GET | `/events/:id` | | `{ id, name, location, startsAt, open, capacity, pageUrl, attendees: [{ id, name, email, company, checkedInAt }] }` |
| POST | `/events/:id/checkin` | `{ code }` (scanned ticket QR) | `{ status: "ok"\|"already"\|"unknown", name?, company?, at? }` |
| GET | `/jobs` | | `{ jobs: [{ id, title, location, workType, open, counts: { NEW?, SHORTLISTED?, INTERVIEW?, OFFER?, REJECTED? }, total }] }` |
| PATCH | `/applications/:id` | `{ status }` one of NEW, SHORTLISTED, INTERVIEW, OFFER, REJECTED | `{ ok }` |

Mode keys: FOUNDER, INVESTOR, SERVICES (shown as "Business"), HIRE ("Hire me"), RECRUITER, HACKATHON, OTHER, ALL.
Mode `icon` values are names in the web app's icon set: flag, trend, store, user, user-search, code, dot, layers.

Local test accounts: `demo@founder.example` / `demo1234` (user with sample activity), `admin@foundertouch.example` / `admin1234` (FounderTouch team).
