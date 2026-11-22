/**
 * A lapozott, rendezhető listák (Jelentkezők, Programok, a program
 * Jelentkezők füle) közös URL-állapot segédei. Tiszta modul: a kliens, a
 * szerver és a teszt is használja.
 */

export const PAGE_SIZES = [10, 25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];
export type SortOrder = "asc" | "desc";

/** Ennél nagyobb oldalszám az URL-ben érvénytelen (az 1. oldalra esik). */
export const MAX_PAGE = 100_000;

/** Pozitív egész szöveg → szám; minden más `undefined`. */
export function positiveInt(value: string | null | undefined) {
	if (value == null || !/^\d+$/.test(value)) return undefined;
	const n = Number(value);
	return n >= 1 ? n : undefined;
}

/** Az URL `page` értéke; érvénytelen vagy túl nagy → 1. */
export function parsePage(value: string | null | undefined): number {
	const page = positiveInt(value);
	return page !== undefined && page <= MAX_PAGE ? page : 1;
}

/** Az URL `pageSize` értéke, ha a választhatók egyike; különben `fallback`. */
export function parsePageSize(
	value: string | null | undefined,
	fallback: PageSize,
): PageSize {
	const size = positiveInt(value);
	return PAGE_SIZES.find((n) => n === size) ?? fallback;
}

/** Az URL `order` értéke; érvénytelen → `fallback`. */
export function parseOrder(
	value: string | null | undefined,
	fallback: SortOrder,
): SortOrder {
	return value === "asc" || value === "desc" ? value : fallback;
}

/** Az értékek közül az egyezőt adja (pl. rendezési kulcs, fül), vagy `undefined`. */
export function oneOf<T extends string>(
	values: readonly T[],
	value: string | null | undefined,
): T | undefined {
	return values.find((v) => v === value);
}

/**
 * Állapotváltozás: minden, ami nem lapozás (szűrés, rendezés, lapméret), az
 * 1. oldalra visz vissza.
 */
export function withPageReset<T extends { page: number }>(
	state: T,
	patch: Partial<T>,
): T {
	const onlyPage = Object.keys(patch).every((key) => key === "page");
	return { ...state, ...patch, ...(!onlyPage && { page: 1 }) };
}

/** UI-rendezési kulcs → API `sort`; `invert`-nél az irány megfordul. */
export type ApiSortMap<K extends string> = Record<
	K,
	{ key: string; invert: boolean }
>;

/**
 * Az API `sort` és `order` paramétere egy UI-rendezésből. Az életkor
 * például születési év szerint, fordítva rendez (fiatalabb = nagyobb év).
 */
export function apiSort<K extends string>(
	map: ApiSortMap<K>,
	sort: K,
	order: SortOrder,
): { sort: string; order: SortOrder } {
	const { key, invert } = map[sort];
	return { sort: key, order: invert ? flipOrder(order) : order };
}

export function flipOrder(order: SortOrder): SortOrder {
	return order === "asc" ? "desc" : "asc";
}

/** A Next `searchParams` → `URLSearchParams` (ismételt kulcs minden értékével). */
export function toURLSearchParams(
	searchParams: Record<string, string | string[] | undefined>,
): URLSearchParams {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(searchParams)) {
		for (const v of [value ?? []].flat()) params.append(key, v);
	}
	return params;
}
