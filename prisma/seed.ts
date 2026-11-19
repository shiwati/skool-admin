import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { logger } from "../src/lib/logger";
import { dataFileSchema } from "../src/lib/seed-data-schema";
import { dashboardDemoData } from "../src/lib/seed-demo-data";
import { assertLocalDatabase } from "../src/lib/seed-guard";
import { formatValidationErrors } from "../src/lib/validation";

const databaseUrl = process.env.DATABASE_URL ?? "";
const reset = process.argv.includes("--reset");

const dataDir = path.resolve(process.cwd(), "prisma", "seed-data");
const localFile = path.join(dataDir, "local.json");
const dataFile = existsSync(localFile)
	? localFile
	: path.join(dataDir, "sample.json");

// A dashboard-demóadat a mintafájl mellé mindig, a local.json mellé csak
// `--demo` kapcsolóval töltődik be (valódi adat közé ne keveredjen).
const withDemo = process.argv.includes("--demo") || dataFile !== localFile;

const prisma = new PrismaClient({
	adapter: new PrismaPg({ connectionString: databaseUrl }),
});

async function seed() {
	assertLocalDatabase(databaseUrl, process.env.NODE_ENV);

	const fileData = JSON.parse(readFileSync(dataFile, "utf8"));
	const demo = withDemo ? dashboardDemoData() : null;
	const parsed = dataFileSchema.safeParse(
		demo
			? {
					events: [...(fileData.events ?? []), ...demo.events],
					applicants: [
						...(fileData.applicants ?? []),
						...demo.applicants,
					],
					applications: [
						...(fileData.applications ?? []),
						...demo.applications,
					],
				}
			: fileData,
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

	await prisma.$transaction(
		async (tx) => {
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
		},
		// A demóadat több ezer sor: az alapértelmezett 5 s-os limit kevés.
		{ timeout: 120_000 },
	);

	logger.info(
		{
			file: path.basename(dataFile),
			reset,
			demo: withDemo,
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
