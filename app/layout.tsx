import "./globals.css";
import SwRegister from "@/components/sw-register";
import A11yEnhancer from "@/components/a11y-enhancer";
export const metadata = {
  title: { default: "FounderTouch", template: "%s · FounderTouch" },
  description: "Share yourself with a QR code or an NFC tap.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "FounderTouch", statusBarStyle: "default" as const },
};
export const viewport = { width: "device-width", initialScale: 1, themeColor: "#4f46e5" }; // zoom stays enabled
export default function L({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <div className="phone">{children}</div>
        <SwRegister />
        <A11yEnhancer />
      </body>
    </html>
  );
}
