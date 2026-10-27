import { PrismaClient } from "@prisma/client";

// Eine Instanz pro Prozess, auch bei Hot Reload im Dev-Modus
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/** Transaktions-Client, den die Services untereinander weitergeben. */
export type Tx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">;
