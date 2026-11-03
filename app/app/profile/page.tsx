import { redirect } from "next/navigation";

/** Profile now lives on Home. */
export default function ProfileMoved() {
  redirect("/app#profile");
}
