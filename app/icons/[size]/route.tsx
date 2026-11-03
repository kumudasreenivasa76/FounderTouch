import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";

/** App icon at 192 or 512 px. */
export async function GET(_: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const px = size === "512" ? 512 : size === "192" ? 192 : 0;
  if (!px) return new NextResponse("Not found", { status: 404 });
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#4f46e5,#9333ea)", color: "#fff", fontSize: px * 0.5, fontWeight: 800 }}>FT</div>
    ),
    { width: px, height: px, headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
