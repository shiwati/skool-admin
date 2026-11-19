import { z } from "zod";

/**
 * A Jelentkezők lista állapota és annak leképezése az URL-re és a
 * `GET /api/applicants` query-re. Tiszta modul: a kliens és a teszt is
 * használja.
 */

export const PAGE_SIZES = [10, 25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export const SORT_KEYS = ["name", "age", "location", "createdAt"] as const;
export type SortKey = (typeof SORT_KEYS)[number];
export type SortOrder = "asc" | "desc";

export type ListFilters = {
	q?: string;
	eventIds: string[];
	ageFrom?: number;
	ageTo?: number;
	hometown?: string;
	newsletter?: boolean;
	attended?: boolean;
};

export type ListState = ListFilters & {
	sort: SortKey;
	order: SortOrder;
	page: number;
	pageSize: PageSize;
};

export const DEFAULT_STATE: ListState = {
	eventIds: [],
	sort: "createdAt",
	order: "desc",
	page: 1,
	pageSize: 25,
};

/** UI-oszlop → API `sort`. Az életkor fordítva rendez: fiatalabb = nagyobb születési év. */
const API_SORT: Record<SortKey, { key: string; invert: boolean }> = {
	name: { key: "lastName", invert: false },
	age: { key: "birthYear", invert: true },
	location: { key: "hometown", invert: false },
	createdAt: { key: "createdAt", invert: false },
};

const text = z.string().trim().min(1).max(200).optional().catch(undefined);
const age = z.coerce.number().int().min(0).max(120).optional().catch(undefined);
const bool = z
	.enum(["true", "false"])
	.transform((v) => v === "true")
	.optional()
	.catch(undefined);

export function ageRangeError(
	ageFrom: number | undefined,
	ageTo: number | undefined,
): string | null {
	if (ageFrom !== undefined && ageTo !== undefined && ageFrom > ageTo) {
		return "A minimum életkor nem lehet nagyobb a maximumnál.";
	}
	return null;
}

/** URL → állapot. Az érvénytelen értékek csendben az alapértelmezésre esnek vissza. */
export function parseListState(params: URLSearchParams): ListState {
	const get = (key: string) => params.get(key) ?? undefined;

	const eventIds = [
		...new Set(
			params
				.getAll("eventIds")
				.flatMap((v) => v.split(","))
				.map((v) => v.trim())
				.filter(Boolean),
		),
	];
	let ageFrom = age.parse(get("ageFrom"));
	let ageTo = age.parse(get("ageTo"));
	if (ageRangeError(ageFrom, ageTo)) {
		ageFrom = undefined;
		ageTo = undefined;
	}

	const sort = z.enum(SORT_KEYS).catch(DEFAULT_STATE.sort).parse(get("sort"));
	const order = z
		.enum(["asc", "desc"])
		.catch(
			// Explicit sort without order: dates newest first, the rest A→Z.
			sort === "createdAt" ? "desc" : "asc",
		)
		.parse(get("order"));
	const pageSize = z.coerce
		.number()
		.pipe(z.union(PAGE_SIZES.map((n) => z.literal(n))))
		.catch(DEFAULT_STATE.pageSize)
		.parse(get("pageSize")) as PageSize;
	const page = z.coerce
		.number()
		.int()
		.min(1)
		.max(100_000)
		.catch(1)
		.parse(get("page"));

	return {
		q: text.parse(get("q")),
		eventIds,
		ageFrom,
		ageTo,
		hometown: text.parse(get("hometown")),
		newsletter: bool.parse(get("newsletter")),
		attended: bool.parse(get("attended")),
		sort,
		order,
		page,
		pageSize,
	};
}

function setFilters(params: URLSearchParams, filters: ListFilters) {
	if (filters.q) params.set("q", filters.q);
	if (filters.eventIds.length)
		params.set("eventIds", filters.eventIds.join(","));
	if (filters.ageFrom !== undefined)
		params.set("ageFrom", String(filters.ageFrom));
	if (filters.ageTo !== undefined) params.set("ageTo", String(filters.ageTo));
	if (filters.hometown) params.set("hometown", filters.hometown);
	if (filters.newsletter !== undefined)
		params.set("newsletter", String(filters.newsletter));
	if (filters.attended !== undefined)
		params.set("attended", String(filters.attended));
}

/** Állapot → URL query; az alapértelmezett értékek kimaradnak. */
export function toSearchParams(state: ListState): URLSearchParams {
	const params = new URLSearchParams();
	setFilters(params, state);
	if (
		state.sort !== DEFAULT_STATE.sort ||
		state.order !== DEFAULT_STATE.order
	) {
		params.set("sort", state.sort);
		params.set("order", state.order);
	}
	if (state.page !== 1) params.set("page", String(state.page));
	if (state.pageSize !== DEFAULT_STATE.pageSize)
		params.set("pageSize", String(state.pageSize));
	return params;
}

/** Állapot → `GET /api/applicants` query (felülírható lap és lapméret, pl. az e-mail listához). */
export function toApiQuery(
	state: ListState,
	overrides: { page?: number; pageSize?: number } = {},
): URLSearchParams {
	const params = new URLSearchParams();
	params.set("page", String(overrides.page ?? state.page));
	params.set("pageSize", String(overrides.pageSize ?? state.pageSize));
	const { key, invert } = API_SORT[state.sort];
	params.set("sort", key);
	params.set(
		"order",
		invert ? (state.order === "asc" ? "desc" : "asc") : state.order,
	);
	setFilters(params, state);
	return params;
}

/**
 * Állapotváltozás: minden, ami nem lapozás, az 1. oldalra visz vissza.
 */
export function updateListState(
	state: ListState,
	patch: Partial<ListState>,
): ListState {
	const next = { ...state, ...patch };
	const onlyPage = Object.keys(patch).every((key) => key === "page");
	if (!onlyPage) next.page = 1;
	return next;
}

export function hasActiveFilters(state: ListFilters): boolean {
	return Boolean(
		state.q ||
		state.eventIds.length ||
		state.ageFrom !== undefined ||
		state.ageTo !== undefined ||
		state.hometown ||
		state.newsletter !== undefined ||
		state.attended !== undefined,
	);
}

export function clearFilters(state: ListState): ListState {
	return updateListState(state, {
		q: undefined,
		eventIds: [],
		ageFrom: undefined,
		ageTo: undefined,
		hometown: undefined,
		newsletter: undefined,
		attended: undefined,
	});
}

/** Az aktuális eredményhalmazt azonosító kulcs (kijelölés törléséhez). */
export function resultKey(state: ListState): string {
	return toSearchParams(state).toString();
}
