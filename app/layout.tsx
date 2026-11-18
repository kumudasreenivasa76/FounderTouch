import "./globals.css";
import NativeBridge from "@/components/native-bridge";
import "./ds.css";
import "./light.css";
import "./light-tokens.css";
import "./design.css";
import { cookies } from "next/headers";
import { Geist_Mono, Inter } from "next/font/google";
import SwRegister from "@/components/sw-register";
import A11yEnhancer from "@/components/a11y-enhancer";
import EmbedFlag from "@/components/embed-flag";
const sans = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

export const metadata = {
  title: { default: "TapNodd", template: "%s · TapNodd" },
  description: "Share yourself with a QR code or an NFC tap.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "TapNodd", statusBarStyle: "default" as const },
};
export const viewport = { width: "device-width", initialScale: 1, themeColor: "#FBFAFF" }; // zoom stays enabled
/** Theme: light by default (the app design); "dark" or "system" from the visitor's choice (theme cookie). */
const SYSTEM_THEME = `try{if(matchMedia("(prefers-color-scheme: dark)").matches){document.documentElement.dataset.theme="dark"}}catch(e){}`;
export default async function L({ children }: { children: React.ReactNode }) {
  const pref = (await cookies()).get("theme")?.value;
  const theme = pref === "dark" ? "dark" : "light";
  return (
    <html lang="en" data-theme={theme} className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>{pref === "system" && <script dangerouslySetInnerHTML={{ __html: SYSTEM_THEME }} />}</head>
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <div className="phone">{children}</div>
        <SwRegister />
        <A11yEnhancer />
        <EmbedFlag />
        <NativeBridge />
      </body>
    </html>
  );
}
