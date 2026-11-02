# FounderTouch mobile

iOS and Android app for FounderTouch, one codebase: Expo SDK 58, React Native 0.88, Expo Router, TypeScript.
It talks to the Next.js app's JSON API (`/api/v1`, contract in `../docs/mobile-api.md`) with bearer tokens.

## Run it

Start the web app first (repo root, `http://localhost:4401`). Then:

```bash
cd mobile
npm install            # first time only (uses package-lock.json)
npx expo start         # then press i (iOS simulator), a (Android emulator) or w (web)
```

The camera, secure storage and haptics are all in Expo Go, so Expo Go works for day to day testing.
For a standalone dev build instead: `npx expo run:ios` / `npx expo run:android`.

### Pointing the app at the API

The base URL comes from `EXPO_PUBLIC_API_URL` (default `http://localhost:4401/api/v1`). Copy `.env.example` to `.env` to change it.

| Where the app runs | Value |
|---|---|
| iOS simulator, web | `http://localhost:4401/api/v1` (default) |
| Android emulator | `http://10.0.2.2:4401/api/v1` |
| Physical phone (same Wi-Fi) | `http://<your Mac's LAN IP>:4401/api/v1`, e.g. `http://192.168.1.20:4401/api/v1` |

Find the Mac's LAN IP with `ipconfig getifaddr en0`. The Next dev server must listen on all interfaces for a phone to reach it
(`next dev -H 0.0.0.0 -p 4401`). Restart `expo start` after changing `.env` (add `-c` to clear the cache).

Note: page links, share links and QR codes come from the API, so they use whatever host the web app thinks it is on.
When testing on a phone, open the web app via the LAN IP too, or set its public URL, so those links resolve on the phone.

### Test login

- `demo@founder.example` / `demo1234` (sample card, contacts, requests, applicants, an event)
- `admin@foundertouch.example` / `admin1234`

The iOS simulator has no camera. Use "Or paste a card link" on Scan and "Type code" on the door check in screen to try those flows.

## Screens

- Log in, Sign up (optional invite code), first-time Set up (name, headline, company, modes)
- Share: greeting and stats, the flippable card, mode picker, QR per mode, Share / Copy link / Open page, 7 day scan chart, pull to refresh, `/me` notice banner
- Scan: camera QR scanner, card preview sheet with Save to wallet and Open page, wallet list with remove
- Contacts: People, Requests (approve / decline), Applicants (tap to move stage), email via `mailto:`
- Events: list, event detail with attendees, full-screen door check in scanner with haptics
- Profile: edit basics, contact and socials, mode switches and "Needs approval", links to the web, log out

## Layout

```
app/                    routes (Expo Router)
  _layout.tsx           fonts, auth provider, protected stack (signed out / set-up / signed in)
  login.tsx signup.tsx setup.tsx
  (tabs)/               index (Share), scan, contacts, events, profile
  event/[id]/           index (detail), checkin (door scanner)
src/
  api.ts                typed API client (bearer header, JSON errors, logout on 401)
  auth.tsx              token + /me state
  storage.ts            expo-secure-store, AsyncStorage on web
  theme.ts              design tokens from app/globals.css
  actions.ts            share, copy, open page, mailto, confirm
  useLoad.ts format.ts
  components/           Button, Screen, Surface, ListRow, Pill, Segmented, Empty, Sheet,
                        BusinessCard, QrScanner, ScanChart, Field, Avatar, Icon, ...
```

## Checks

```bash
npx tsc --noEmit
npx expo export --platform ios      # and android / web; delete dist/ afterwards
npx expo-doctor
```

## Store builds (EAS)

`eas.json` has `development`, `preview` and `production` profiles. Set the real API host in the `env` block of
`preview` / `production` first (the `REPLACE-WITH-YOUR-HOST` placeholder), then:

```bash
npm install -g eas-cli      # or use npx eas-cli@latest
eas login
eas build -p ios            # App Store build, bundle id com.foundertouch.app
eas build -p android        # Play Store AAB, package com.foundertouch.app
eas submit -p ios|android   # upload to the stores
```

The first iOS build asks for an Apple Developer account and creates the signing certificate and profile.
