import { MODE_INFO, Mode, parseFields } from "./modes";

type Cfg = { kitText: string; fields: string; intro: string } | undefined;
type Res = { modes: string };

/**
 * A mode only counts as "added" once the owner has put something in it. Visitors never see empty modes,
 * and the Share screen offers the empty ones under "Add a mode". "All" is always there.
 */
export function modeHasContent(mode: string, cfg: Cfg, resources: Res[], extra: { projects: number; events: number; jobs?: number; career?: number }): boolean {
  if (mode === "ALL") return true;
  if (!MODE_INFO[mode as Mode] || !cfg) return false;
  if (mode === "HIRE") return (extra.career ?? 0) > 0;
  if (cfg.kitText.trim() || cfg.intro.trim()) return true;
  if (Object.values(parseFields(cfg.fields)).some((v) => String(v).trim())) return true;
  if (resources.some((r) => r.modes.split(",").includes(mode))) return true;
  if (mode === "HACKATHON" && (extra.projects > 0 || extra.events > 0)) return true;
  if (mode === "RECRUITER" && (extra.jobs ?? 0) > 0) return true;
  return false;
}
