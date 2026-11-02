import { NextRequest } from "next/server";
import { authed, ok, originOf } from "@/lib/api";
import { getSettings } from "@/lib/platform";
import { parseSocials } from "@/lib/socials";
import { byline } from "@/lib/look";

/** Who is signed in, their profile (or null before set-up) and any notice from the FounderTouch team. */
export const GET = authed(async (req, { user }) => {
  const p = user.profile, origin = originOf(req);
  return ok({
    user: { id: user.id, email: user.email, name: user.name, firstName: user.firstName, lastName: user.lastName, role: user.role },
    profile: p && {
      handle: p.handle, name: p.name, firstName: p.firstName, lastName: p.lastName, headline: p.headline, company: p.company, bio: p.bio,
      phone: p.phone, email: p.email, website: p.website, socials: parseSocials(p.socials), byline: byline(p.headline, p.company),
      photoUrl: p.photo ? `${origin}/photo/${p.handle}?v=${encodeURIComponent(p.photo)}` : null, pageUrl: `${origin}/${p.handle}`,
      openTo: p.openTo, skills: p.skills,
    },
    notice: (await getSettings()).notice || null,
  });
}, { needsProfile: false });
