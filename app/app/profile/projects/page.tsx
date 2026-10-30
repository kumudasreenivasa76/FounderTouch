import { redirect } from "next/navigation";

/** Projects now live together with sections. */
export default function ProjectsMoved() {
  redirect("/app/profile/sections");
}
