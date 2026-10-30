import { redirect } from "next/navigation";

/** Text blocks were folded into each mode's About text. Projects have their own screen. */
export default function SectionsMoved() {
  redirect("/app/profile/projects");
}
