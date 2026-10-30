import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canView } from "@/lib/access";
import { MODES } from "@/lib/modes";
import { SOCIALS, parseSocials } from "@/lib/socials";

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/[;,]/g, (c) => "\\" + c).replace(/\r?\n/g, "\\n");

export async function GET(req: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const p = await db.profile.findUnique({ where: { handle } });
  if (!p) return new NextResponse("Not found", { status: 404 });
  const q = new URL(req.url).searchParams.get("mode") ?? "ALL";
  const mode = (MODES as readonly string[]).includes(q) ? q : "ALL";
  const cfg = await db.modeConfig.findFirst({ where: { profileId: p.id, mode } });
  if (cfg && !(await canView(p, mode, cfg.requireApproval))) return new NextResponse("This page needs the owner approval.", { status: 403 });
  const first = p.firstName || p.name.split(/\s+/).slice(0, -1).join(" "), last = p.lastName || p.name.split(/\s+/).slice(-1)[0];
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${esc(p.name)}`, `N:${esc(last)};${esc(first)};;;`];
  if (p.company) lines.push(`ORG:${esc(p.company)}`);
  if (p.headline) lines.push(`TITLE:${esc(p.headline)}`);
  if (p.email) lines.push(`EMAIL:${p.email}`);
  if (p.phone) lines.push(`TEL;TYPE=CELL:${p.phone}`);
  if (p.website) lines.push(`URL:${p.website}`);
  const soc = parseSocials(p.socials);
  for (const x of SOCIALS) if (soc[x.key]) lines.push(`URL;TYPE=${x.label.split(" ")[0]}:${soc[x.key]}`);
  lines.push("END:VCARD");
  return new NextResponse(lines.join("\r\n") + "\r\n", {
    headers: { "Content-Type": "text/vcard; charset=utf-8", "Content-Disposition": `attachment; filename="${handle}.vcf"` },
  });
}
