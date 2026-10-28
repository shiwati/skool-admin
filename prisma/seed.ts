import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { logger } from "../src/lib/logger";
import { parseEnv } from "../src/lib/env-schema";

const env = parseEnv(process.env);

const prisma = new PrismaClient({
	adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
});

async function seed() {
	// Add idempotent infrastructure seed operations here when needed.
	await prisma.$queryRaw`SELECT 1`;
	logger.info("Seed infrastructure ready; no application data created");
}

seed()
	.catch((error: unknown) => {
		logger.error({ err: error }, "Database seed failed");
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
