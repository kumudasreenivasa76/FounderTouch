/** A steady colour per person for initials badges. Every colour keeps white text above 4.5:1. */
const PALETTE = ["#0a66c2", "#7048e8", "#c2410c", "#047857", "#b91c1c", "#0e7490", "#6d28d9", "#9d174d", "#115e59", "#4338ca"];
export const avatarBg = (seed: string) => PALETTE[[...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % PALETTE.length];
