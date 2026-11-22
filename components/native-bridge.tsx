"use client";

type Cap = { isNativePlatform?: () => boolean; Plugins?: { Share?: { share: (o: { title?: string; text?: string; url?: string; dialogTitle?: string }) => Promise<unknown> } } };

/**
 * Inside the Android app (Capacitor) give the page what Chrome would have. Runs as soon as this
 * module loads, before any screen checks for these features; in a normal browser it does nothing.
 *  - navigator.share opens the Android share sheet.
 *  - Files the page builds itself (blob: links, e.g. "Save contact file") are handed to the app as
 *    data: links, which the app saves to Downloads.
 */
function install() {
  const cap = (window as unknown as { Capacitor?: Cap }).Capacitor;
  if (!cap?.isNativePlatform?.() || (window as unknown as { __tnNative?: boolean }).__tnNative) return;
  (window as unknown as { __tnNative?: boolean }).__tnNative = true;
  document.documentElement.classList.add("native-app");
  const share = cap.Plugins?.Share;
  if (share) {
    Object.defineProperty(navigator, "share", { configurable: true, value: (d: ShareData) => share.share({ title: d.title, text: d.text, url: d.url, dialogTitle: "Share" }).then(() => undefined) });
    Object.defineProperty(navigator, "canShare", { configurable: true, value: (d?: ShareData) => !d?.files?.length });
  }
  const toData = async (a: HTMLAnchorElement) => {
    const blob = await (await fetch(a.href)).blob();
    const url = await new Promise<string>((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.readAsDataURL(blob); });
    const d = document.createElement("a"); d.href = url; d.download = a.download || "tapnodd-file"; document.body.appendChild(d); d.click(); d.remove();
  };
  const click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
    if (this.hasAttribute("download") && this.href.startsWith("blob:")) { void toData(this); return; }
    return click.call(this);
  };
  document.addEventListener("click", (e) => {
    const a = (e.target as Element | null)?.closest?.("a[download]") as HTMLAnchorElement | null;
    if (a && a.href.startsWith("blob:")) { e.preventDefault(); void toData(a); }
  }, true);
}
if (typeof window !== "undefined") install();

export default function NativeBridge() {
  return null;
}
