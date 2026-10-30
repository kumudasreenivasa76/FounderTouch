import { redirect } from "next/navigation";

/** Projects live together with text blocks. */
export default function ProjectsMoved() {
  redirect("/app/profile/sections?tab=projects");
}
