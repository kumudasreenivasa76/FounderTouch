import "./globals.css";
import "./ds.css";
import { Geist, Geist_Mono } from "next/font/google";
import SwRegister from "@/components/sw-register";
import A11yEnhancer from "@/components/a11y-enhancer";
import EmbedFlag from "@/components/embed-flag";
const sans = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

export const metadata = {
  title: { default: "TapNodd", template: "%s · TapNodd" },
  description: "Share yourself with a QR code or an NFC tap.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "TapNodd", statusBarStyle: "default" as const },
};
export const viewport = { width: "device-width", initialScale: 1, themeColor: "#f2f3f6" }; // zoom stays enabled
export default function L({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <div className="phone">{children}</div>
        <SwRegister />
        <A11yEnhancer />
        <EmbedFlag />
      </body>
    </html>
  );
}
