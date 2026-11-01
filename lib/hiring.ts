export const STATUSES = [
  { key: "NEW", label: "New", color: "#2350d8" },
  { key: "SHORTLISTED", label: "Shortlisted", color: "#4b5059" },
  { key: "INTERVIEW", label: "Interview", color: "#b0661a" },
  { key: "OFFER", label: "Offer", color: "#127a52" },
  { key: "REJECTED", label: "Rejected", color: "#9aa0a8" },
] as const;
export const statusLabel = (k: string) => STATUSES.find((s) => s.key === k)?.label ?? k;
export const EMPLOYMENT = ["Full-time", "Part-time", "Contract", "Internship", "Freelance"] as const;
export const WORK_TYPES = ["On-site", "Hybrid", "Remote"] as const;
