import { db } from "./db";
import { hashPassword } from "./auth";
import { createProfile, openInvite, signupAllowed } from "./platform";

export type RegisterError = "details" | "password" | "exists" | "invite" | "domain" | "invite-email" | "invite-dead";

/**
 * Creates an account, for the web sign-up and the mobile app alike.
 * With a valid invite the sign-up policy does not apply, the invite's role is given,
 * and the profile is created straight away from what the FounderTouch team filled in.
 */
export async function registerUser(d: { firstName: string; lastName: string; email: string; password: string; invite?: string }):
  Promise<{ ok: true; userId: string; hasProfile: boolean } | { ok: false; error: RegisterError }> {
  const firstName = d.firstName.trim(), lastName = d.lastName.trim(), email = d.email.trim().toLowerCase(), name = `${firstName} ${lastName}`.trim();
  if (!firstName || !lastName || !/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "details" };
  if (d.password.length < 8) return { ok: false, error: "password" };

  const invite = d.invite ? await openInvite(d.invite) : null;
  if (d.invite && !invite) return { ok: false, error: "invite-dead" };
  if (invite && invite.email.toLowerCase() !== email) return { ok: false, error: "invite-email" };
  if (!invite) {
    const allowed = await signupAllowed(email);
    if (!allowed.ok) return { ok: false, error: allowed.reason };
  }
  if (await db.user.findUnique({ where: { email } })) return { ok: false, error: "exists" };

  const u = await db.user.create({
    data: { name, firstName, lastName, email, passwordHash: hashPassword(d.password), role: invite?.role === "ADMIN" ? "ADMIN" : "USER", inviteId: invite?.id ?? "" },
  });
  if (!invite) return { ok: true, userId: u.id, hasProfile: false };

  await createProfile(u.id, {
    name, firstName, lastName, headline: invite.headline, company: invite.company,
    modes: invite.modes.split(",").map((m) => m.trim()).filter(Boolean),
  });
  await db.onboardingInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date(), acceptedUserId: u.id } });
  return { ok: true, userId: u.id, hasProfile: true };
}

export const REGISTER_MSG: Record<RegisterError, string> = {
  details: "Enter your first name, last name and a valid email.",
  password: "Password must be at least 8 characters.",
  exists: "That email already has an account. Log in instead.",
  invite: "Sign-ups are by invitation right now. Ask the FounderTouch team for an invite link.",
  domain: "Sign-ups are limited to certain email domains right now. Use your work email, or ask for an invite.",
  "invite-dead": "This invite link has expired, was withdrawn, or has already been used. Ask the FounderTouch team for a new one.",
  "invite-email": "This invite is for a different email address. Use the email the invite was sent to.",
};
