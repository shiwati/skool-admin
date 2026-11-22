import path from "node:path";

/** A setup által írt böngészőállapot (session cookie); gitignore-olt. */
export const AUTH_FILE = path.join(
	import.meta.dirname,
	"..",
	".auth",
	"admin.json",
);
