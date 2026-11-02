import { NextRequest } from "next/server";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { authed, ok, originOf } from "@/lib/api";
import { MODES, MODE_INFO, Mode } from "@/lib/modes";
import { byline, themeOf } from "@/lib/look";

/** Everything the Share screen needs: card look, each page with its link, QR and last-7-day scans. */
export const GET = authed(async (req, { user }) => {
  const p = user.profile!, origin = originOf(req);
  const [cfgs, links, contacts, saved] = await Promise.all([
    db.modeConfig.findMany({ where: { profileId: p.id } }),
    db.shareLink.findMany({ where: { profileId: p.id }, include: { _count: { select: { scans: true } } } }),
    db.contact.count({ where: { profileId: p.id } }),
    db.savedCard.count({ where: { userId: user.id } }),
  ]);
  const since = new Date(); since.setHours(0, 0, 0, 0); since.setDate(since.getDate() - 6);
  const recent = await db.scanEvent.findMany({ where: { shareLinkId: { in: links.map((l) => l.id) }, createdAt: { gte: since } }, select: { shareLinkId: true, createdAt: true, source: true } });
  const dayIdx = (d: Date) => Math.floor((d.getTime() - since.getTime()) / 86400000);
  const theme = themeOf(p.theme);

  const modes = await Promise.all(MODES.map(async (m) => {
    const cfg = cfgs.find((c) => c.mode === m), link = links.find((l) => l.mode === m);
    if (!cfg || !link) return null;
    const url = `${origin}/s/${link.token}`;
    const days = Array(7).fill(0);
    for (const r of recent) if (r.shareLinkId === link.id) { const i = dayIdx(r.createdAt); if (i >= 0 && i < 7) days[i]++; }
    return {
      mode: m, label: MODE_INFO[m as Mode].label, icon: MODE_INFO[m as Mode].icon, blurb: MODE_INFO[m as Mode].blurb,
      enabled: cfg.isEnabled, needsApproval: cfg.requireApproval, url, pageUrl: `${origin}/${p.handle}?mode=${m}`,
      qr: cfg.isEnabled ? await QRCode.toDataURL(`${url}?src=qr`, { errorCorrectionLevel: "H", margin: 1, width: 600, color: { dark: "#15171a", light: "#ffffff" } }) : null,
      scans: link._count.scans, days,
    };
  }));

  return ok({
    name: p.name, byline: byline(p.headline, p.company), handle: p.handle,
    photoUrl: p.photo ? `${origin}/photo/${p.handle}?v=${encodeURIComponent(p.photo)}` : null,
    theme: { from: theme.from, to: theme.to, name: theme.name },
    lines: [p.phone && { icon: "phone", text: p.phone }, p.email && { icon: "mail", text: p.email }, p.website && { icon: "globe", text: p.website.replace(/^https?:\/\//, "") }].filter(Boolean),
    modes: modes.filter(Boolean),
    stats: { scans: links.reduce((n, l) => n + l._count.scans, 0), taps: recent.filter((r) => r.source === "nfc").length, contacts, saved },
    cardImageUrl: `${origin}/card/${p.handle}/image?mode=ALL`,
  });
});
