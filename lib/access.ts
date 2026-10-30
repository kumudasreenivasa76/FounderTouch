import { cookies } from "next/headers";
import { db, MODE_ACCESS_DAYS } from "./db";
import { currentUser } from "./auth";

export const accessCookie = (profileId: string, mode: string) => `acc_${profileId}_${mode}`;

/**
 * Can the current visitor see this mode's page?
 * Yes if the owner did not require approval, if they are the owner, or if they hold an approved, unexpired access link.
 */
export async function canView(profile: { id: string }, mode: string, requireApproval: boolean): Promise<boolean> {
  if (!requireApproval) return true;
  const u = await currentUser();
  if (u?.profile?.id === profile.id) return true;
  const token = (await cookies()).get(accessCookie(profile.id, mode))?.value;
  if (!token) return false;
  const r = await db.modeRequest.findUnique({ where: { token } });
  return !!r && r.profileId === profile.id && r.mode === mode && r.status === "APPROVED" && !!r.decidedAt && Date.now() - r.decidedAt.getTime() < MODE_ACCESS_DAYS * 86400_000;
}
