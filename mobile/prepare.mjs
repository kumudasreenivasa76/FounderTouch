// Writes the offline page's "Try again" target from APP_URL, then runs `cap sync android`.
import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";
const url = process.env.APP_URL || "https://tapnodd-main-production.up.railway.app";
const p = new URL("./www/offline.html", import.meta.url);
writeFileSync(p, readFileSync(p, "utf8").replace(/location\.href=[^"]*"/, `location.href='${url}/'"`));
execSync("npx cap sync android", { stdio: "inherit", env: { ...process.env, APP_URL: url } });
