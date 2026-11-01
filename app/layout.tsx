import "./globals.css";
import { Hanken_Grotesk } from "next/font/google";
import Frame from "@/components/frame";

const sans = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata = {
  title: "FounderTouch: one card for every room you walk into",
  description: "A digital business card with a page for every role. Share by QR, tap or link, control who sees what, and run events and hiring from the same card.",
};
export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#f6f7f8" };
export default function L({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={sans.variable}><body><Frame>{children}</Frame></body></html>;
}
