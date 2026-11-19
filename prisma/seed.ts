import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { logger } from "../src/lib/logger";
import { dataFileSchema } from "../src/lib/seed-data-schema";
import { assertLocalDatabase } from "../src/lib/seed-guard";
import { formatValidationErrors } from "../src/lib/validation";

const databaseUrl = process.env.DATABASE_URL ?? "";
const reset = process.argv.includes("--reset");

const dataDir = path.resolve(process.cwd(), "prisma", "seed-data");
const localFile = path.join(dataDir, "local.json");
const dataFile = existsSync(localFile)
	? localFile
	: path.join(dataDir, "sample.json");

const prisma = new PrismaClient({
	adapter: new PrismaPg({ connectionString: databaseUrl }),
});

async function seed() {
	assertLocalDatabase(databaseUrl, process.env.NODE_ENV);

	const parsed = dataFileSchema.safeParse(
		JSON.parse(readFileSync(dataFile, "utf8")),
	);
	if (!parsed.success) {
		logger.error(
			{
				file: path.basename(dataFile),
				errors: formatValidationErrors(parsed.error),
			},
			"Seed data file is invalid",
		);
		process.exitCode = 1;
		return;
	}
	const { events, applicants, applications } = parsed.data;

	await prisma.$transaction(async (tx) => {
		if (reset) {
			await tx.application.deleteMany();
			await tx.applicant.deleteMany();
			await tx.event.deleteMany();
		}
		for (const { id, ...data } of events) {
			await tx.event.upsert({
				where: { id },
				create: { id, ...data },
				update: data,
			});
		}
		for (const { id, ...data } of applicants) {
			await tx.applicant.upsert({
				where: { id },
				create: { id, ...data },
				update: data,
			});
		}
		for (const { id, ...data } of applications) {
			await tx.application.upsert({
				where: { id },
				create: { id, ...data },
				update: data,
			});
		}
	});

	logger.info(
		{
			file: path.basename(dataFile),
			reset,
			events: events.length,
			applicants: applicants.length,
			applications: applications.length,
		},
		"Seed data loaded",
	);
}

seed()
	.catch((error: unknown) => {
		logger.error({ err: error }, "Seed failed");
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
