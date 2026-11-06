import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TapNodd", short_name: "TapNodd", description: "Share yourself with a QR code or an NFC tap.",
    start_url: "/app", scope: "/", display: "standalone", background_color: "#ffffff", theme_color: "#3b5bdb",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
