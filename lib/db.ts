import { PrismaClient } from "@prisma/client";
const g = globalThis as unknown as { prisma?: PrismaClient };
export const db = g.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") g.prisma = db;
export { MODES } from "./modes";
export const OWNER_HANDLE = "demo";
export const ACCESS_DAYS = 7;
export const MODE_ACCESS_DAYS = 30;
