/**
 * One-off, safe to run every start: the Hire me mode was replaced by Normal.
 * Moves every stored "HIRE" mode to "NORMAL" so links, tags, stats and saved cards keep working.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  // Profiles that somehow have both rows keep NORMAL; the old HIRE row goes.
  const normals = new Set((await db.modeConfig.findMany({ where: { mode: "NORMAL" }, select: { profileId: true } })).map((r) => r.profileId));
  if (normals.size) await db.modeConfig.deleteMany({ where: { mode: "HIRE", profileId: { in: [...normals] } } });
  const moved = await db.modeConfig.updateMany({ where: { mode: "HIRE" }, data: { mode: "NORMAL", ctaLabel: "Get in touch" } });
  const dupLinks = (await db.shareLink.findMany({ where: { mode: "NORMAL" }, select: { profileId: true } })).map((r) => r.profileId);
  if (dupLinks.length) await db.shareLink.deleteMany({ where: { mode: "HIRE", profileId: { in: dupLinks } } });
  await db.shareLink.updateMany({ where: { mode: "HIRE" }, data: { mode: "NORMAL" } });
  for (const t of ["scanEvent", "contact", "modeRequest", "savedCard", "nfcTag"] as const) {
    await (db[t] as unknown as { updateMany: (a: object) => Promise<unknown> }).updateMany({ where: { mode: "HIRE" }, data: { mode: "NORMAL" } });
  }
  // Comma lists: HIRE is dropped (the experience details now live on the full profile).
  const strip = (v: string) => v.split(",").filter((m) => m && m !== "HIRE").join(",");
  for (const r of await db.resource.findMany({ where: { modes: { contains: "HIRE" } }, select: { id: true, modes: true } })) await db.resource.update({ where: { id: r.id }, data: { modes: strip(r.modes) } });
  for (const r of await db.project.findMany({ where: { modes: { contains: "HIRE" } }, select: { id: true, modes: true } })) await db.project.update({ where: { id: r.id }, data: { modes: strip(r.modes) } });
  for (const r of await db.profile.findMany({ where: { hireModes: { contains: "HIRE" } }, select: { id: true, hireModes: true } })) await db.profile.update({ where: { id: r.id }, data: { hireModes: strip(r.hireModes) } });
  if (moved.count) console.log(`modes: moved ${moved.count} Hire me pages to Normal`);
}

main().catch((e) => { console.error("mode migration skipped:", e?.message ?? e); }).finally(() => db.$disconnect());
