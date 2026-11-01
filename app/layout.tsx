import "./globals.css";
import { Hanken_Grotesk } from "next/font/google";

const sans = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata = { title: "FounderTouch" };
export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#f6f7f8" };
export default function L({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={sans.variable}><body><div className="phone">{children}</div></body></html>;
}
