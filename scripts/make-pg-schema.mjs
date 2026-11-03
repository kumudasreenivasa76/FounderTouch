// Builds prisma/schema.postgres.prisma from the SQLite schema, for AWS (RDS Postgres).
import { readFileSync, writeFileSync } from "node:fs";
const s = readFileSync("prisma/schema.prisma", "utf8").replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"').replace(/url\s*=\s*"?env\("DATABASE_URL"\)"?|url\s*=\s*env\("DATABASE_URL"\)/, 'url = env("DATABASE_URL")');
writeFileSync("prisma/schema.postgres.prisma", s);
console.log("wrote prisma/schema.postgres.prisma");
