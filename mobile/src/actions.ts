import { Alert, Linking, Platform, Share } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as WebBrowser from "expo-web-browser";

export async function openPage(url: string) {
  try {
    if (Platform.OS === "web") {
      window.open(url, "_blank", "noopener");
      return;
    }
    await WebBrowser.openBrowserAsync(url, { controlsColor: "#15171a", toolbarColor: "#ffffff" });
  } catch {
    void Linking.openURL(url);
  }
}

export async function shareLink(url: string, message?: string) {
  try {
    if (Platform.OS === "web") {
      const nav = navigator as Navigator & { share?: (d: { url: string; text?: string }) => Promise<void> };
      if (nav.share) await nav.share({ url, text: message });
      else {
        await Clipboard.setStringAsync(url);
        notify("Link copied", "Sharing is not available here, so the link was copied instead.");
      }
      return;
    }
    await Share.share(Platform.OS === "ios" ? { url, message } : { message: message ? `${message}\n${url}` : url });
  } catch {
    // user dismissed
  }
}

export async function copy(text: string) {
  await Clipboard.setStringAsync(text);
}

export function email(to: string, subject?: string) {
  const q = subject ? `?subject=${encodeURIComponent(subject)}` : "";
  void Linking.openURL(`mailto:${to}${q}`).catch(() => notify("No mail app", `Write to ${to}`));
}

export function notify(title: string, message?: string) {
  if (Platform.OS === "web") window.alert(message ? `${title}\n\n${message}` : title);
  else Alert.alert(title, message);
}

/** Yes / no confirm that also works on web. */
export function confirm(title: string, message: string, okLabel: string, destructive = false): Promise<boolean> {
  if (Platform.OS === "web") return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: okLabel, style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
    ]),
  );
}
