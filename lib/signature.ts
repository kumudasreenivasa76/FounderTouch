import type { Profile } from "@prisma/client";
import { byline, themeOf, readable } from "@/lib/look";

export const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

/** Email signature as inline-styled HTML, so it pastes into Gmail or Outlook with formatting. */
export function buildSignature(profile: Profile, url: string, banner = ""): string {
  const t = themeOf(profile.theme);
  const rc = readable(t.from);
  const sub = byline(profile.headline, profile.company);
  return `<table cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;font-size:13px;color:#1c2330"><tr><td style="border-left:4px solid ${t.from};padding-left:12px"><div style="font-size:16px;font-weight:bold">${escHtml(profile.name)}</div>${sub ? `<div style="color:#566074">${escHtml(sub)}</div>` : ""}<div style="margin-top:6px">${[profile.phone && escHtml(profile.phone), profile.email && `<a href="mailto:${escHtml(profile.email)}" style="color:${rc}">${escHtml(profile.email)}</a>`].filter(Boolean).join(" · ")}</div><div style="margin-top:6px"><a href="${escHtml(url)}" style="color:${rc};font-weight:bold">View my digital card</a></div>${banner}</td></tr></table>`;
}

/** The organization's campaign banner line, if one is set. */
export function buildBanner(org: { bannerText: string; bannerUrl: string } | null | undefined, theme: string): string {
  if (!org?.bannerText) return "";
  const rc = readable(themeOf(theme).from);
  return `<div style="margin-top:8px;padding:6px 0;border-top:1px solid #e3e6ec">${org.bannerUrl ? `<a href="${escHtml(org.bannerUrl)}" style="color:${rc}">${escHtml(org.bannerText)}</a>` : escHtml(org.bannerText)}</div>`;
}
