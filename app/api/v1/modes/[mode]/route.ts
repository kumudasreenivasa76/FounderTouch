import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { authed, body, fail, ok } from "@/lib/api";
import { MODES } from "@/lib/modes";

/** Switch a page on or off, or require approval to see it. "All" always stays on. */
export const PATCH = authed<{ mode: string }>(async (req, { user, params }) => {
  const mode = params.mode.toUpperCase();
  if (!(MODES as readonly string[]).includes(mode)) return fail("mode", 404, "No such page.");
  const b = await body<{ enabled: boolean; needsApproval: boolean }>(req);
  const data: { isEnabled?: boolean; requireApproval?: boolean } = {};
  if (typeof b.enabled === "boolean" && mode !== "ALL") data.isEnabled = b.enabled;
  if (typeof b.needsApproval === "boolean") data.requireApproval = b.needsApproval;
  await db.modeConfig.updateMany({ where: { profileId: user.profile!.id, mode }, data });
  return ok({ ok: true });
});
