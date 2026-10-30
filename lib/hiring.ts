export const STATUSES = [
  { key: "NEW", label: "New", color: "#3b5bdb" },
  { key: "SHORTLISTED", label: "Shortlisted", color: "#7048e8" },
  { key: "INTERVIEW", label: "Interview", color: "#e8590c" },
  { key: "OFFER", label: "Offer", color: "#0ca678" },
  { key: "REJECTED", label: "Rejected", color: "#868e96" },
] as const;
export const statusLabel = (k: string) => STATUSES.find((s) => s.key === k)?.label ?? k;
export const EMPLOYMENT = ["Full-time", "Part-time", "Contract", "Internship", "Freelance"] as const;
export const WORK_TYPES = ["On-site", "Hybrid", "Remote"] as const;
