import { redirect } from "next/navigation";

/** Roles and applicants now live in Recruiting. */
export default function JobsMoved() {
  redirect("/app/hire");
}
