import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import Intro from "./intro";

export const dynamic = "force-dynamic";
export const metadata = { title: "Welcome" };

/** Welcome & Intro (design 2): four short slides, then sign up. */
export default async function Welcome() {
  if (await currentUser()) redirect("/app");
  return <Intro />;
}
