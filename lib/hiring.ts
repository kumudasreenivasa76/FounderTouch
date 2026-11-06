export const STATUSES = [
  { key: "NEW", label: "New", color: "#3b5bdb" },
  { key: "SHORTLISTED", label: "Shortlisted", color: "#7048e8" },
  { key: "INTERVIEW", label: "Interview", color: "#c2410c" },
  { key: "OFFER", label: "Offer", color: "#047857" },
  { key: "HIRED", label: "Hired", color: "#1b6e2e" },
  { key: "REJECTED", label: "Rejected", color: "#5f6670" },
] as const;
export const statusLabel = (k: string) => STATUSES.find((s) => s.key === k)?.label ?? k;
export const EMPLOYMENT = ["Full-time", "Part-time", "Contract", "Internship", "Freelance"] as const;
export const WORK_TYPES = ["On-site", "Hybrid", "Remote"] as const;

/** The forward path of a candidate. Rejected sits outside it. */
export const PIPELINE = ["NEW", "SHORTLISTED", "INTERVIEW", "OFFER", "HIRED"] as const;
export const nextStage = (k: string) => { const i = PIPELINE.indexOf(k as (typeof PIPELINE)[number]); return i >= 0 && i < PIPELINE.length - 1 ? PIPELINE[i + 1] : null; };

const words = (s: string) => s.toLowerCase().split(/[,\n;/|]+/).map((x) => x.trim()).filter(Boolean);
/** How many of the role's skills the candidate lists. `total` is 0 when the role lists none. */
export function skillMatch(roleSkills: string, candidateSkills: string) {
  const need = words(roleSkills), have = words(candidateSkills);
  const hit = need.filter((n) => have.some((h) => h === n || h.includes(n) || n.includes(h)));
  return { hit: hit.length, total: need.length };
}
