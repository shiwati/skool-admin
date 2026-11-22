import { globSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Az app route-jai a fájlrendszerből, hogy minden új oldal és API route
 * automatikusan bekerüljön a hozzáférési tesztekbe.
 */

const APP_DIR = path.join(import.meta.dirname, "..", "..", "src", "app");

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
export type Method = (typeof METHODS)[number];

/** `src/app/...` könyvtár → URL útvonal (route groupok nélkül). */
function toUrlPath(dir: string): string {
	const segments = dir
		.split(path.sep)
		.filter((s) => s && !(s.startsWith("(") && s.endsWith(")")));
	return `/${segments.join("/")}`;
}

/** Egy route fájl exportált HTTP metódusai. */
function exportedMethods(source: string): Method[] {
	return METHODS.filter(
		(method) =>
			new RegExp(
				`export\\s+(async\\s+function|const|function)\\s+${method}\\b`,
			).test(source) || new RegExp(`\\bas\\s+${method}\\b`).test(source),
	);
}

export type ApiRoute = { pattern: string; methods: Method[] };

/** Minden `src/app/api/**\/route.ts`, a mintájával (pl. `/api/events/[id]`). */
export function apiRoutes(): ApiRoute[] {
	return globSync("api/**/route.ts", { cwd: APP_DIR })
		.map((file) => ({
			pattern: toUrlPath(path.dirname(file)),
			methods: exportedMethods(
				readFileSync(path.join(APP_DIR, file), "utf8"),
			),
		}))
		.sort((a, b) => a.pattern.localeCompare(b.pattern));
}

/** Minden admin oldal (`src/app/(admin)/**\/page.tsx`) mintája. */
export function adminPages(): string[] {
	return globSync("(admin)/**/page.tsx", { cwd: APP_DIR })
		.map((file) => toUrlPath(path.dirname(file)))
		.sort();
}

/**
 * A dinamikus szegmensek kitöltése: `[id]` → `ids[<előtte álló szegmens>]`,
 * pl. `{ events: "e2e-event-01" }`; ismeretlen szegmensnél `fallback`.
 */
export function fillParams(
	pattern: string,
	ids: Record<string, string>,
	fallback: string,
): string {
	const segments = pattern.split("/");
	return segments
		.map((segment, i) =>
			/^\[.+\]$/.test(segment)
				? encodeURIComponent(ids[segments[i - 1]] ?? fallback)
				: segment,
		)
		.join("/");
}
