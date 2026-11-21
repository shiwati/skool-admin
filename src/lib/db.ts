import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { env } from "@/lib/env";

const globalForPrisma = globalThis as typeof globalThis & {
	prisma?: PrismaClient;
};

export const db =
	globalForPrisma.prisma ??
	new PrismaClient({
		adapter: new PrismaPg({
			// Futásidőben a poololt URL; a migrációk a prisma.config.ts-ben a direktet használják.
			connectionString: env.DATABASE_URL_POOLED ?? env.DATABASE_URL,
			max: 10,
			connectionTimeoutMillis: 5_000,
			idleTimeoutMillis: 30_000,
		}),
	});

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
