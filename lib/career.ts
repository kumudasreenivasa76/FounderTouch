export const OPEN_TO = ["Open to work", "Open to freelance", "Open to consulting", "Hiring", "Not looking"] as const;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2023-04" -> "Apr 2023", "2019" -> "2019", "" -> "" */
export function fmtDate(v: string): string {
  const m = /^(\d{4})(?:-(\d{2}))?$/.exec(v);
  if (!m) return "";
  return m[2] ? `${MONTHS[Number(m[2]) - 1] ?? ""} ${m[1]}`.trim() : m[1];
}
export const fmtRange = (start: string, end: string) => {
  const a = fmtDate(start), b = fmtDate(end);
  if (!a && !b) return "";
  return `${a || "?"} – ${b || "Present"}`;
};
/** Newest first. Items without a start date go last. */
export const byStartDesc = <T extends { start: string }>(a: T, b: T) => (b.start || "").localeCompare(a.start || "");
export const validDate = (v: string) => (/^\d{4}(-\d{2})?$/.test(v) ? v : "");
