import "server-only";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";
import { appConfig } from "@/lib/config";

const globalForPrisma = globalThis as unknown as { daybook?: PrismaClient };

export function getDb(): PrismaClient {
  if (!globalForPrisma.daybook) {
    const adapter = new PrismaBetterSqlite3({ url: appConfig().databaseUrl });
    globalForPrisma.daybook = new PrismaClient({ adapter });
  }
  return globalForPrisma.daybook;
}
