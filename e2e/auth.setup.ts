import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test as setup } from "@playwright/test";
import {
	e2eDatabaseUrl,
	ensureDatabase,
	migrate,
	truncateAll,
} from "./support/database";
import { AUTH_FILE } from "./support/paths";
import { seedDatabase } from "./support/seed";

/**
 * Minden futás előtt: E2E adatbázis létrehozása (ha kell), migrációk,
 * ürítés, tesztadat, és a bejelentkezett admin sessionje a böngésző
 * számára (`storageState`).
 */
setup("prepare database and admin session", async ({ baseURL }) => {
	setup.setTimeout(120_000);
	const databaseUrl = e2eDatabaseUrl();

	await ensureDatabase(databaseUrl);
	migrate(databaseUrl);
	await truncateAll(databaseUrl);
	const sessionToken = await seedDatabase(databaseUrl);

	const { hostname } = new URL(baseURL!);
	mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
	writeFileSync(
		AUTH_FILE,
		JSON.stringify({
			cookies: [
				{
					// Plain-http NEXTAUTH_URL → the non-`__Secure-` cookie name.
					name: "next-auth.session-token",
					value: sessionToken,
					domain: hostname,
					path: "/",
					expires: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
					httpOnly: true,
					secure: false,
					sameSite: "Lax",
				},
			],
			origins: [],
		}),
	);
});
