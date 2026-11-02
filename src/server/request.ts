import "server-only";
import { io } from "next/cache";
import type { PrismaClient } from "@/generated/prisma/client";
import { getDb } from "./db";

/** Reads happen per request. `io` keeps SQLite results out of the static shell. */
export async function requestDb(): Promise<PrismaClient> {
  await io();
  return getDb();
}
