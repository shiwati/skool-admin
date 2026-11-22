import { execFileSync } from "node:child_process";
import { Client } from "pg";

/**
 * Az E2E tesztek saját adatbázisa. A setup minden futás előtt kiüríti, ezért
 * csak lokális, `_e2e` végű adatbázis lehet: a fejlesztői adatbázishoz
 * (`DATABASE_URL`) sosem nyúl.
 */

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const NAME_PATTERN = /^[a-z0-9_]+_e2e$/;

/**
 * `E2E_DATABASE_URL`, vagy a `DATABASE_URL` ugyanazon a szerveren, `_e2e`
 * utótaggal (pl. `skool_admin` → `skool_admin_e2e`).
 */
export function e2eDatabaseUrl(
	env: Record<string, string | undefined> = process.env,
): string {
	const explicit = env.E2E_DATABASE_URL?.trim();
	let url: URL;
	if (explicit) {
		url = new URL(explicit);
	} else {
		const base = env.DATABASE_URL?.trim();
		if (!base) {
			throw new Error(
				"E2E: set DATABASE_URL (in .env) or E2E_DATABASE_URL",
			);
		}
		url = new URL(base);
		url.pathname = `/${databaseName(url)}_e2e`;
	}
	assertE2eDatabase(url);
	return url.toString();
}

function databaseName(url: URL): string {
	return decodeURIComponent(url.pathname.replace(/^\//, ""));
}

/** Fail-closed: csak lokális, `_e2e` végű adatbázist enged. */
export function assertE2eDatabase(url: URL): void {
	if (!LOCAL_HOSTS.has(url.hostname.toLowerCase())) {
		throw new Error(
			`E2E refused: database host "${url.hostname}" is not local`,
		);
	}
	if (!NAME_PATTERN.test(databaseName(url))) {
		throw new Error(
			`E2E refused: database "${databaseName(url)}" must match ${NAME_PATTERN}`,
		);
	}
}

/** Létrehozza az adatbázist, ha még nincs (a szerver `postgres` adatbázisán át). */
export async function ensureDatabase(databaseUrl: string): Promise<void> {
	const url = new URL(databaseUrl);
	assertE2eDatabase(url);
	const name = databaseName(url);
	const admin = new URL(databaseUrl);
	admin.pathname = "/postgres";
	admin.search = "";

	const client = new Client({ connectionString: admin.toString() });
	await client.connect();
	try {
		const { rowCount } = await client.query(
			"SELECT 1 FROM pg_database WHERE datname = $1",
			[name],
		);
		// The name matches NAME_PATTERN, so quoting it is safe.
		if (rowCount === 0) await client.query(`CREATE DATABASE "${name}"`);
	} finally {
		await client.end();
	}
}

/** A repó migrációi az E2E adatbázisra (ugyanaz, mint deployban). */
export function migrate(databaseUrl: string): void {
	assertE2eDatabase(new URL(databaseUrl));
	execFileSync("npx", ["prisma", "migrate", "deploy"], {
		env: { ...process.env, DATABASE_URL: databaseUrl },
		stdio: "pipe",
	});
}

/** Minden tábla ürítése a migrációs napló kivételével. */
export async function truncateAll(databaseUrl: string): Promise<void> {
	assertE2eDatabase(new URL(databaseUrl));
	const client = new Client({ connectionString: databaseUrl });
	await client.connect();
	try {
		const { rows } = await client.query<{ tablename: string }>(
			`SELECT tablename FROM pg_tables
			 WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`,
		);
		if (rows.length === 0) return;
		const tables = rows
			.map(({ tablename }) => `"public"."${tablename}"`)
			.join(", ");
		await client.query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
	} finally {
		await client.end();
	}
}
