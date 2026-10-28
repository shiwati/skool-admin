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
			connectionString: env.DATABASE_URL,
			max: 10,
			connectionTimeoutMillis: 5_000,
			idleTimeoutMillis: 30_000,
		}),
	});

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
