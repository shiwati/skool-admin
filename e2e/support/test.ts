import { test as base, type TestInfo } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { e2eDatabaseUrl } from "./database";
import { createFactory, type Factory } from "./factory";

/**
 * A Playwright `test` a `factory` fixture-rel, az író tesztekhez
 * (`e2e/writes/`). Használat: `import { expect, test } from "../support/test"`.
 */

/** Tesztenként egyedi, újrapróbálásnál és ismétlésnél is. Csak betű és szám. */
function uniqueToken(info: TestInfo): string {
	// The whole id: its first part is shared by every test in the file.
	const id = info.testId.replace(/[^a-z0-9]/gi, "");
	return `T${id}r${info.retry}e${info.repeatEachIndex}`;
}

export const test = base.extend<{ factory: Factory }, { db: PrismaClient }>({
	db: [
		async ({}, provide) => {
			const db = new PrismaClient({
				adapter: new PrismaPg({ connectionString: e2eDatabaseUrl() }),
			});
			await provide(db);
			await db.$disconnect();
		},
		{ scope: "worker" },
	],
	factory: async ({ db }, provide, testInfo) => {
		await provide(createFactory(db, uniqueToken(testInfo)));
	},
});

export { expect } from "@playwright/test";
