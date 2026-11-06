import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Browser-tab icon: the TapNodd mark (two cards meeting). */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        <svg viewBox="0 0 64 64" width={32} height={32}>
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#3b5bdb" />
              <stop offset="1" stopColor="#7048e8" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" rx="14" fill="url(#g)" />
          <rect x="12" y="19" width="27" height="18" rx="5" fill="#fff" opacity="0.45" transform="rotate(-9 25.5 28)" />
          <rect x="25" y="27" width="27" height="18" rx="5" fill="#fff" transform="rotate(7 38.5 36)" />
        </svg>
      </div>
    ),
    size,
  );
}
