const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * Fail-closed védelem: a mintaadat-seed csak lokális adatbázisra futhat,
 * sosem productionben. Hibát dob, ha bármi kétséges.
 */
export function assertLocalDatabase(
	databaseUrl: string,
	nodeEnv: string | undefined,
) {
	if (nodeEnv === "production") {
		throw new Error("Seed refused: NODE_ENV is production");
	}

	let host: string;
	try {
		host = new URL(databaseUrl).hostname.toLowerCase();
	} catch {
		throw new Error("Seed refused: DATABASE_URL is not a valid URL");
	}

	if (!LOCAL_HOSTS.has(host)) {
		throw new Error(
			`Seed refused: database host "${host}" is not local (localhost/127.0.0.1 only)`,
		);
	}
}
