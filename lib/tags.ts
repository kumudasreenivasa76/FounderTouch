/** "Legal, NDA ,legal" -> "legal,nda" (lowercase, de-duplicated, max 8 tags of 24 chars). */
export function cleanTags(raw: string): string {
  const out: string[] = [];
  for (const t of raw.split(/[,;\n]/)) {
    const v = t.trim().toLowerCase().replace(/^#/, "").replace(/\s+/g, " ").slice(0, 24);
    if (v && !out.includes(v)) out.push(v);
    if (out.length === 8) break;
  }
  return out.join(",");
}
export const tagList = (s: string) => (s ? s.split(",").filter(Boolean) : []);
