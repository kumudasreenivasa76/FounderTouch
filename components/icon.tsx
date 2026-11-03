import type { ReactElement } from "react";

/** One small line-icon set for the whole app. Same stroke, same size, so everything feels like one product. */
const P: Record<string, ReactElement> = {
  home: <path d="M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10M10 19.5v-5h4v5" />,
  card: <><rect x="3" y="5" width="18" height="14" rx="3" /><circle cx="9" cy="11" r="2" /><path d="M6 16c.6-1.4 1.7-2 3-2s2.4.6 3 2M15 10h3M15 13.5h3" /></>,
  users: <><circle cx="9" cy="8.5" r="3.2" /><path d="M3 20c.5-3.4 3-5.2 6-5.2s5.5 1.8 6 5.2" /><path d="M16 5.6a3.2 3.2 0 0 1 0 5.8M18 14.9c1.8.6 2.9 2.2 3.2 5.1" /></>,
  user: <><circle cx="12" cy="8" r="3.6" /><path d="M5 20c.7-3.8 3.6-5.8 7-5.8s6.3 2 7 5.8" /></>,
  more: <><circle cx="5.5" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="18.5" cy="12" r="1.3" /></>,
  plug: <path d="M9 3v5M15 3v5M6.5 8h11v3.5a5.5 5.5 0 0 1-11 0zM12 17v4" />,
  nfc: <path d="M6 8.5a6 6 0 0 1 0 7M10 6a10 10 0 0 1 0 12M14 3.5a14 14 0 0 1 0 17" />,
  tools: <path d="M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3zM6 4l3 3-2 2-3-3z" />,
  wallet: <><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3" /><rect x="3" y="7.5" width="18" height="12" rx="3" /><circle cx="16.5" cy="13.5" r="1.1" /></>,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  building: <path d="M5 20V5.5A1.5 1.5 0 0 1 6.5 4h7A1.5 1.5 0 0 1 15 5.5V20M15 10h3.5A1.5 1.5 0 0 1 20 11.5V20M3 20h18M8.5 8h3M8.5 12h3M8.5 16h3" />,
  calendar: <><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M8 3v4M16 3v4M3.5 10h17" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
  briefcase: <><rect x="3" y="7.5" width="18" height="12" rx="3" /><path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M3 13h18" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" /></>,
  mail: <><rect x="3" y="5.5" width="18" height="13" rx="3" /><path d="m4 8 8 6 8-6" /></>,
  phone: <path d="M6.5 3.5h3l1.5 4-2 1.3a11 11 0 0 0 6.2 6.2l1.3-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2z" />,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18" /></>,
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  message: <path d="M4 5.5h16v10.5H9.5L5 20v-4H4z" />,
  chat: <path d="M20.5 11.7a8.2 8.2 0 0 1-12.4 7L3.5 20l1.4-4.3a8.2 8.2 0 1 1 15.6-4z" />,
  copy: <><rect x="8.5" y="8.5" width="12" height="12" rx="3" /><path d="M15.5 8.5V6.5a3 3 0 0 0-3-3h-6a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h2" /></>,
  download: <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" />,
  share: <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />,
  qr: <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2.5v2.5H14zM19 14h1v1M14 19.5h3M19 17.5v2.5" />,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="3" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></>,
  file: <path d="M7 3.5h6.5L19 9v10.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1zM13.5 3.5V9H19M9 13h6M9 16.5h6" />,
  play: <><circle cx="12" cy="12" r="9" /><path d="m10.2 8.7 5 3.3-5 3.3z" /></>,
  tag: <path d="M3.5 12.2V5.5a2 2 0 0 1 2-2h6.7l8.3 8.3a2 2 0 0 1 0 2.8l-6 6a2 2 0 0 1-2.8 0zM8 8h.01" />,
  folder: <path d="M3.5 7a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />,
  rocket: <path d="M12 3c3.5 2 5 5.5 4.5 10l-2.3 2.3h-4.4L7.5 13C7 8.5 8.5 5 12 3zM9.8 15.3 8 19l3-1.2M14.2 15.3 16 19l-3-1.2M12 9.2h.01" />,
  coins: <><ellipse cx="9.5" cy="7" rx="5.5" ry="2.5" /><path d="M4 7v4c0 1.4 2.5 2.5 5.5 2.5S15 12.4 15 11V7M4 11v4c0 1.4 2.5 2.5 5.5 2.5M15 12.5c3 0 5 1 5 2.2v3.8c0 1.2-2.2 2.2-5 2.2s-5-1-5-2.2" /></>,
  store: <path d="M4 9.5 5.5 4h13L20 9.5M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M5.5 12.5V20h13v-7.5M10 20v-4.5h4V20" />,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
  pin: <path d="M12 21s6.5-5.7 6.5-11A6.5 6.5 0 0 0 5.5 10c0 5.3 6.5 11 6.5 11zM12 12.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z" />,
  grid: <path d="M4 4h6.5v6.5H4zM13.5 4H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z" />,
  trophy: <path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v4M8.5 20h7" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  video: <><rect x="3" y="6" width="13" height="12" rx="3" /><path d="m16 10.5 5-2.5v8l-5-2.5" /></>,
  spark: <path d="M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2L5 10.5l5.2-1.8zM18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />,
};

const MODE_ICON: Record<string, string> = {
  FOUNDER: "rocket", INVESTOR: "coins", SERVICES: "store", CUSTOMER: "store", HIRE: "briefcase", RECRUITER: "target", OTHER: "pin", ALL: "grid",
};

/** Renders a named icon. An unknown name is shown as plain text so nothing disappears. */
export default function Icon({ name, size = 20, mode }: { name?: string; size?: number; mode?: string }) {
  const key = mode ? MODE_ICON[mode] : name;
  if (!key) return null;
  const g = P[key];
  if (!g) return <>{key}</>;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">{g}</svg>
  );
}

export { MODE_ICON };
