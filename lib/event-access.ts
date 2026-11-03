import { db } from "./db";
import { currentUser } from "./auth";

export const STAFF_ROLES = ["ORGANIZER", "ADMIN", "CHECKIN", "VOLUNTEER", "VENDOR", "SPEAKER", "SPONSOR", "MENTOR", "JUDGE", "RECRUITER"] as const;
const CAN_CHECKIN = ["ORGANIZER", "ADMIN", "CHECKIN", "VOLUNTEER"];

/** What the signed-in user may do at an event: owner, or a role granted by the owner. Checked on the server for every scan. */
export async function eventAccess(eventId: string) {
  const u = await currentUser();
  if (!u) return null;
  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event) return null;
  const owner = !!u.profile && event.profileId === u.profile.id;
  const roles = owner ? [] : await db.eventStaff.findMany({ where: { eventId, userId: u.id } });
  return {
    user: u, event, owner,
    canCheckIn: owner || roles.some((r) => CAN_CHECKIN.includes(r.role)),
    vendorScopes: roles.filter((r) => r.role === "VENDOR").map((r) => r.scope),
    isVendor: roles.some((r) => r.role === "VENDOR"),
    isRecruiter: roles.some((r) => r.role === "RECRUITER"),
  };
}
