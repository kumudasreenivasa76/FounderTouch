import type { CapacitorConfig } from "@capacitor/cli";

/**
 * TapNodd for Android: a native shell around the live web app.
 * The app loads APP_URL (default: the deployed tapnodd-main service). To test against the local dev
 * server use `npm run android:apk:local`: it loads http://localhost:4401 and runs
 * `adb reverse tcp:4401 tcp:4401` so the phone or emulator reaches this Mac (localhost also lets the
 * camera work, which needs a secure page).
 */
const url = process.env.APP_URL || "https://tapnodd-main-production.up.railway.app";

const config: CapacitorConfig = {
  appId: "com.tapnodd.app",
  appName: "TapNodd",
  webDir: "mobile/www",
  server: {
    url,
    cleartext: url.startsWith("http://"),
    errorPath: "offline.html",
  },
  android: {
    backgroundColor: "#FBFAFF",
  },
  plugins: {
    // The web app does not draw under the status bar, so Android pads the web view; dark icons on the light app.
    SystemBars: { insetsHandling: "native", style: "LIGHT" },
  },
};

export default config;
