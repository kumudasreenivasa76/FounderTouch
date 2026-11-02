import { Platform } from "react-native";
import { getToken } from "./storage";

/* ------------------------------------------------------------------
   Typed client for the FounderTouch mobile API (docs/mobile-api.md).
------------------------------------------------------------------- */

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:4401/api/v1").replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let onUnauthorized: (() => void) | null = null;
/** The auth provider registers this so any 401 logs the user out locally. */
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

type Method = "GET" | "POST" | "PATCH" | "DELETE";

async function request<T>(method: Method, path: string, body?: unknown, opts: { token?: string | null; skip401?: boolean } = {}): Promise<T> {
  const token = opts.token !== undefined ? opts.token : await getToken();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(API_URL + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, "network", "Could not reach FounderTouch. Check your connection and try again.");
  }

  let data: any = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    if (res.status === 401 && !opts.skip401 && token) onUnauthorized?.();
    const message = (data && typeof data.message === "string" && data.message) || defaultMessage(res.status);
    throw new ApiError(res.status, (data && data.error) || "error", message);
  }
  return data as T;
}

function defaultMessage(status: number) {
  if (status === 401) return "Your session has ended. Please log in again.";
  if (status === 404) return "That could not be found.";
  if (status >= 500) return "Something went wrong on our side. Please try again.";
  return "That did not work. Please try again.";
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Something went wrong.";
}

const device = `FounderTouch ${Platform.OS === "ios" ? "iOS" : Platform.OS === "android" ? "Android" : "Web"}`;

/* ---------- types ---------- */

export type ModeKey = "FOUNDER" | "INVESTOR" | "SERVICES" | "HIRE" | "RECRUITER" | "HACKATHON" | "OTHER" | "ALL";

export const MODE_OPTIONS: { mode: ModeKey; label: string; icon: string }[] = [
  { mode: "FOUNDER", label: "Founder", icon: "flag" },
  { mode: "INVESTOR", label: "Investor", icon: "trend" },
  { mode: "SERVICES", label: "Business", icon: "store" },
  { mode: "HIRE", label: "Hire me", icon: "user" },
  { mode: "RECRUITER", label: "Recruiter", icon: "user-search" },
  { mode: "HACKATHON", label: "Hackathon", icon: "code" },
  { mode: "OTHER", label: "Other", icon: "dot" },
];

export type Socials = Partial<Record<"linkedin" | "x" | "instagram" | "github" | "youtube" | "facebook" | "telegram" | "portfolio" | "whatsapp", string>>;

export type Profile = {
  handle: string;
  name: string;
  firstName: string;
  lastName: string;
  headline: string;
  company: string;
  bio: string;
  phone: string;
  email: string;
  website: string;
  socials: Socials;
  byline: string;
  photoUrl: string | null;
  pageUrl: string;
  openTo: string;
  skills: string;
};

export type Me = {
  user: { id: string; email: string; name: string; firstName: string; lastName: string; role: string };
  profile: Profile | null;
  notice: string | null;
};

export type CardMode = {
  mode: ModeKey;
  label: string;
  icon: string;
  blurb: string;
  enabled: boolean;
  needsApproval: boolean;
  url: string;
  pageUrl: string;
  qr: string | null;
  scans: number;
  days: number[];
};

export type CardData = {
  name: string;
  byline: string;
  handle: string;
  photoUrl: string | null;
  theme: { from: string; to: string; name: string };
  lines: { icon: string; text: string }[];
  modes: CardMode[];
  stats: { scans: number; taps: number; contacts: number; saved: number };
  cardImageUrl: string | null;
};

export type Person = { id: string; name: string; email: string; company: string; linkedin: string; via: string; at: string };
export type AccessRequest = { id: string; kind: "deck" | "mode"; name: string; email: string; what: string; note?: string; at: string };
export type AppStatus = "NEW" | "SHORTLISTED" | "INTERVIEW" | "OFFER" | "REJECTED";
export type Applicant = { id: string; name: string; email: string; job: string; status: AppStatus; statusLabel: string; at: string };
export type Contacts = { people: Person[]; requests: AccessRequest[]; applicants: Applicant[] };

export type Peek =
  | { kind: "card"; handle: string; name: string; byline: string; mode: ModeKey; modeLabel: string; photoUrl: string | null; pageUrl: string; own: boolean; saved?: boolean; theme?: { from: string; to: string } }
  | { kind: "other"; text: string };

export type WalletCard = { id: string; handle: string; name: string; byline: string; mode: ModeKey; modeLabel: string; photoUrl: string | null; pageUrl: string; at: string; theme?: { from: string; to: string } };

export type EventSummary = {
  id: string;
  name: string;
  location: string;
  startsAt: string;
  endsAt: string | null;
  open: boolean;
  capacity: number | null;
  color: string;
  color2: string;
  pageUrl: string;
  registered: number;
  checkedIn: number;
  projects: number;
};

export type Attendee = { id: string; name: string; email: string; company: string; checkedInAt: string | null };
export type EventDetail = { id: string; name: string; location: string; startsAt: string; open: boolean; capacity: number | null; pageUrl: string; attendees: Attendee[] };
export type CheckinResult = { status: "ok" | "already" | "unknown"; name?: string; company?: string; at?: string };

export type ProfileSetup = {
  firstName: string;
  lastName: string;
  handle?: string;
  headline: string;
  company?: string;
  bio?: string;
  phone?: string;
  socials?: Socials;
  modes: ModeKey[];
};

export type ProfilePatch = Partial<Pick<Profile, "firstName" | "lastName" | "headline" | "company" | "bio" | "phone" | "email" | "website" | "socials">>;

/* ---------- endpoints ---------- */

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string }>("POST", "/auth/login", { email, password, device }, { token: null, skip401: true }),
  signup: (body: { firstName: string; lastName: string; email: string; password: string; invite?: string }) =>
    request<{ token: string; hasProfile: boolean }>("POST", "/auth/signup", { ...body, device }, { token: null, skip401: true }),
  logout: () => request<{ ok: boolean }>("POST", "/auth/logout", undefined, { skip401: true }),

  me: (token?: string) => request<Me>("GET", "/me", undefined, token ? { token } : {}),
  setupProfile: (body: ProfileSetup) => request<{ handle: string }>("POST", "/me/profile", body),
  updateProfile: (body: ProfilePatch) => request<{ ok: boolean }>("PATCH", "/me/profile", body),

  card: () => request<CardData>("GET", "/card"),
  updateMode: (mode: ModeKey, body: { enabled?: boolean; needsApproval?: boolean }) => request<{ ok: boolean }>("PATCH", `/modes/${mode}`, body),

  contacts: () => request<Contacts>("GET", "/contacts"),
  decide: (id: string, kind: "deck" | "mode", status: "APPROVED" | "DECLINED") => request<{ ok: boolean }>("POST", `/requests/${id}`, { kind, status }),
  setApplicationStatus: (id: string, status: AppStatus) => request<{ ok: boolean }>("PATCH", `/applications/${id}`, { status }),

  peek: (code: string) => request<Peek>("POST", "/peek", { code }),
  wallet: () => request<{ cards: WalletCard[] }>("GET", "/wallet"),
  saveToWallet: (handle: string, mode: ModeKey) => request<{ ok: boolean }>("POST", "/wallet", { handle, mode }),
  removeFromWallet: (id: string) => request<{ ok: boolean }>("DELETE", `/wallet/${id}`),

  events: () => request<{ events: EventSummary[] }>("GET", "/events"),
  event: (id: string) => request<EventDetail>("GET", `/events/${id}`),
  checkin: (id: string, code: string) => request<CheckinResult>("POST", `/events/${id}/checkin`, { code }),
};
