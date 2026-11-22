/** An investor's deal stages, in pipeline order. */
export const DEAL_STAGES = [
  { key: "NEW", label: "New" },
  { key: "REVIEW", label: "In review" },
  { key: "TERM_SHEET", label: "Term sheet" },
  { key: "INVESTED", label: "Invested" },
  { key: "PASSED", label: "Passed" },
] as const;
export const dealStage = (k: string) => DEAL_STAGES.find((s) => s.key === k)?.label ?? k;
