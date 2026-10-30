import "./globals.css";
export const metadata = { title: "FounderTouch" };
export const viewport = { width: "device-width", initialScale: 1 };
export default function L({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><div className="phone">{children}</div></body></html>;
}
