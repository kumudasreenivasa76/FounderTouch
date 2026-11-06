import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";

/** App icon at 192 or 512 px: the TapNodd mark (two cards meeting). */
export async function GET(_: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const px = size === "512" ? 512 : size === "192" ? 192 : 0;
  if (!px) return new NextResponse("Not found", { status: 404 });
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        <svg viewBox="0 0 64 64" width={px} height={px}>
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#3b5bdb" />
              <stop offset="1" stopColor="#7048e8" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" fill="url(#g)" />
          <rect x="12" y="19" width="27" height="18" rx="5" fill="#fff" opacity="0.45" transform="rotate(-9 25.5 28)" />
          <rect x="25" y="27" width="27" height="18" rx="5" fill="#fff" transform="rotate(7 38.5 36)" />
          <path d="M22 14 l2.4 4.6 M30 11.5 l.6 5.1 M15 20 l4.4 2.6" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" opacity="0.85" fill="none" />
        </svg>
      </div>
    ),
    { width: px, height: px, headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
