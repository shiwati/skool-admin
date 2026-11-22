import { z } from "zod";
import {
	apiSort,
	parseOrder,
	parsePage,
	parsePageSize,
	withPageReset,
	type ApiSortMap,
	type PageSize,
	type SortOrder,
} from "@/lib/list-state";

/**
 * A Jelentkezők lista állapota és annak leképezése az URL-re és a
 * `GET /api/applicants` query-re. Tiszta modul: a kliens és a teszt is
 * használja.
 */

export const SORT_KEYS = [
	"name",
	"age",
	"location",
	"history",
	"createdAt",
] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export type ListFilters = {
	q?: string;
	eventIds: string[];
	programYear?: number;
	ageFrom?: number;
	ageTo?: number;
	hometown?: string;
	newsletter?: boolean;
	/** Elvégzett („Részt vett”) programok száma, tól–ig. */
	historyFrom?: number;
	historyTo?: number;
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
const API_SORT: ApiSortMap<SortKey> = {
	name: { key: "lastName", invert: false },
	age: { key: "birthYear", invert: true },
	location: { key: "hometown", invert: false },
	history: { key: "history", invert: false },
	createdAt: { key: "createdAt", invert: false },
};

const text = z.string().trim().min(1).max(200).optional().catch(undefined);
const year = z.coerce
	.number()
	.int()
	.min(2000)
	.max(2100)
	.optional()
	.catch(undefined);
const age = z.coerce.number().int().min(0).max(120).optional().catch(undefined);
const count = z.coerce
	.number()
	.int()
	.min(0)
	.max(1000)
	.optional()
	.catch(undefined);
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

export function historyRangeError(
	historyFrom: number | undefined,
	historyTo: number | undefined,
): string | null {
	if (
		historyFrom !== undefined &&
		historyTo !== undefined &&
		historyFrom > historyTo
	) {
		return "A minimum programszám nem lehet nagyobb a maximumnál.";
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

	let historyFrom = count.parse(get("historyFrom"));
	let historyTo = count.parse(get("historyTo"));
	if (historyRangeError(historyFrom, historyTo)) {
		historyFrom = undefined;
		historyTo = undefined;
	}

	const sort = z.enum(SORT_KEYS).catch(DEFAULT_STATE.sort).parse(get("sort"));
	// Explicit sort without order: dates newest first, the rest A→Z.
	const order = parseOrder(
		get("order"),
		sort === "createdAt" ? "desc" : "asc",
	);
	const pageSize = parsePageSize(get("pageSize"), DEFAULT_STATE.pageSize);
	const page = parsePage(get("page"));

	return {
		q: text.parse(get("q")),
		eventIds,
		programYear: year.parse(get("programYear")),
		ageFrom,
		ageTo,
		hometown: text.parse(get("hometown")),
		newsletter: bool.parse(get("newsletter")),
		historyFrom,
		historyTo,
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
	if (filters.programYear !== undefined)
		params.set("programYear", String(filters.programYear));
	if (filters.ageFrom !== undefined)
		params.set("ageFrom", String(filters.ageFrom));
	if (filters.ageTo !== undefined) params.set("ageTo", String(filters.ageTo));
	if (filters.hometown) params.set("hometown", filters.hometown);
	if (filters.newsletter !== undefined)
		params.set("newsletter", String(filters.newsletter));
	if (filters.historyFrom !== undefined)
		params.set("historyFrom", String(filters.historyFrom));
	if (filters.historyTo !== undefined)
		params.set("historyTo", String(filters.historyTo));
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
	const sort = apiSort(API_SORT, state.sort, state.order);
	params.set("sort", sort.sort);
	params.set("order", sort.order);
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
	return withPageReset(state, patch);
}

export function hasActiveFilters(state: ListFilters): boolean {
	return Boolean(
		state.q ||
		state.eventIds.length ||
		state.programYear !== undefined ||
		state.ageFrom !== undefined ||
		state.ageTo !== undefined ||
		state.hometown ||
		state.newsletter !== undefined ||
		state.historyFrom !== undefined ||
		state.historyTo !== undefined,
	);
}

export function clearFilters(state: ListState): ListState {
	return updateListState(state, {
		q: undefined,
		eventIds: [],
		programYear: undefined,
		ageFrom: undefined,
		ageTo: undefined,
		hometown: undefined,
		newsletter: undefined,
		historyFrom: undefined,
		historyTo: undefined,
	});
}
