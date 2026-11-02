import { NextRequest } from "next/server";
import { ok } from "@/lib/api";

/** Health check and version for the mobile app. */
export async function GET(_req: NextRequest) {
  return ok({ name: "FounderTouch API", version: 1 });
}
