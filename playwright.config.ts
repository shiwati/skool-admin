import { defineConfig, devices } from "@playwright/test";
import { config as loadDotenv } from "dotenv";
import { e2eDatabaseUrl } from "./e2e/support/database";
import { AUTH_FILE } from "./e2e/support/paths";

/**
 * E2E tesztek a valódi appal és egy külön, `_e2e` végű lokális adatbázissal
 * (lásd docs/testing.md). Az app production buildként fut a 3100-as porton,
 * így nem ütközik a 3000-es dev szerverrel.
 */

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

// Read .env into its own object: loading it into process.env would hand its
// NODE_ENV=development to `next build`, which then fails.
const dotenv: Record<string, string> = {};
loadDotenv({ processEnv: dotenv, quiet: true });
const databaseUrl = e2eDatabaseUrl({ ...dotenv, ...process.env });
// The setup project (a worker) reads it from here.
process.env.E2E_DATABASE_URL = databaseUrl;

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
	use: {
		baseURL,
		locale: "hu-HU",
		timezoneId: "Europe/Budapest",
		trace: "retain-on-failure",
	},
	projects: [
		{ name: "setup", testMatch: /.*\.setup\.ts/ },
		{
			name: "chromium",
			use: {
				...devices["Desktop Chrome"],
				viewport: { width: 1280, height: 800 },
				storageState: AUTH_FILE,
			},
			dependencies: ["setup"],
			testIgnore: /writes\//,
		},
		{
			// Tests that write data (with the factory, e2e/support/test.ts).
			// They run after the read-only tests, whose counts rely on the
			// shared fixtures staying untouched.
			name: "writes",
			testMatch: /writes\/.*\.spec\.ts/,
			use: {
				...devices["Desktop Chrome"],
				viewport: { width: 1280, height: 800 },
				storageState: AUTH_FILE,
			},
			dependencies: ["chromium"],
		},
	],
	webServer: {
		command: `npm run build && npx next start --port ${PORT}`,
		// The port, not /api/health: on the very first run the database is
		// only created by the setup project, after the server is up.
		port: PORT,
		reuseExistingServer: !process.env.CI,
		// Includes `next build`, which is slower on CI runners.
		timeout: 600_000,
		env: {
			DATABASE_URL: databaseUrl,
			DATABASE_URL_POOLED: "",
			NEXTAUTH_URL: baseURL,
			NEXT_TELEMETRY_DISABLED: "1",
		},
	},
});
