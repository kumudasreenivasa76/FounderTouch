import { redirect } from "next/navigation";

/** Scanning now lives on the Card tab. Old links and bookmarks land there. */
export default function ScanMoved() {
  redirect("/app/card?via=scan");
}
