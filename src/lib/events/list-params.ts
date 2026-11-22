import {
	oneOf,
	parseOrder,
	parsePage,
	parsePageSize,
	positiveInt,
	withPageReset,
	type PageSize,
	type SortOrder,
} from "@/lib/list-state";
import { EVENT_PHASES, type EventPhase } from "./phase";
import { tagSchema } from "./tags";

/**
 * A `/events` lista URL-állapota (kliensről is importálható). Az URL az
 * egyetlen igazságforrás: érvénytelen értékek csendben az alapértékre esnek.
 */

export const EVENT_SORT_KEYS = [
	"from",
	"name",
	"companyName",
	"capacity",
] as const;
export type EventSortKey = (typeof EVENT_SORT_KEYS)[number];

export type EventTab = EventPhase | "all";
export const EVENT_TABS: EventTab[] = ["all", ...EVENT_PHASES];

export type EventListFilters = {
	q?: string;
	tags: string[];
	place?: string;
	companyName?: string;
	instructor?: string;
	year?: number;
};

export type EventListState = EventListFilters & {
	tab: EventTab;
	sort: EventSortKey;
	order: SortOrder;
	page: number;
	pageSize: PageSize;
};

export const DEFAULT_TAB: EventTab = "all";
export const DEFAULT_PAGE_SIZE: PageSize = 25;

export const DEFAULT_EVENT_LIST_STATE: EventListState = {
	tab: DEFAULT_TAB,
	tags: [],
	sort: "from",
	order: "desc",
	page: 1,
	pageSize: DEFAULT_PAGE_SIZE,
};

/** Alapértelmezett irány oszloponként: dátum szerint a legújabb elöl. */
export function defaultOrder(sort: EventSortKey): SortOrder {
	return sort === "from" ? "desc" : "asc";
}

function text(value: string | null) {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
}

/** Érvényes címkék normalizálva, ismétlődés nélkül; a hibásak csendben kimaradnak. */
function parseTags(values: string[]): string[] {
	const tags = values.flatMap((value) => {
		const parsed = tagSchema.safeParse(value);
		return parsed.success ? [parsed.data] : [];
	});
	return [...new Set(tags)];
}

export function parseEventListState(params: URLSearchParams): EventListState {
	const sort = oneOf(EVENT_SORT_KEYS, params.get("sort")) ?? "from";
	const year = positiveInt(params.get("year"));
	return {
		tab: oneOf(EVENT_TABS, params.get("tab")) ?? DEFAULT_TAB,
		q: text(params.get("q")),
		tags: parseTags(params.getAll("tags")),
		place: text(params.get("place")),
		companyName: text(params.get("companyName")),
		instructor: text(params.get("instructor")),
		year: year && year >= 2000 && year <= 2100 ? year : undefined,
		sort,
		order: parseOrder(params.get("order"), defaultOrder(sort)),
		page: parsePage(params.get("page")),
		pageSize: parsePageSize(params.get("pageSize"), DEFAULT_PAGE_SIZE),
	};
}

/** Állapot → URL query; az alapértékek kimaradnak, hogy rövid maradjon. */
export function toEventSearchParams(state: EventListState): URLSearchParams {
	const params = new URLSearchParams();
	if (state.tab !== DEFAULT_TAB) params.set("tab", state.tab);
	if (state.q) params.set("q", state.q);
	for (const tag of state.tags) params.append("tags", tag);
	if (state.place) params.set("place", state.place);
	if (state.companyName) params.set("companyName", state.companyName);
	if (state.instructor) params.set("instructor", state.instructor);
	if (state.year !== undefined) params.set("year", String(state.year));
	if (state.sort !== "from") params.set("sort", state.sort);
	if (state.order !== defaultOrder(state.sort))
		params.set("order", state.order);
	if (state.page !== 1) params.set("page", String(state.page));
	if (state.pageSize !== DEFAULT_PAGE_SIZE)
		params.set("pageSize", String(state.pageSize));
	return params;
}

/** Módosítás; minden lapozáson kívüli változás az első oldalra ugrik. */
export function updateEventListState(
	state: EventListState,
	patch: Partial<EventListState>,
): EventListState {
	return withPageReset(state, patch);
}

export function hasActiveEventFilters(filters: EventListFilters): boolean {
	return Boolean(
		filters.q ||
		filters.tags.length ||
		filters.place ||
		filters.companyName ||
		filters.instructor ||
		filters.year !== undefined,
	);
}

export function clearEventFilters(state: EventListState): EventListState {
	return {
		...state,
		q: undefined,
		tags: [],
		place: undefined,
		companyName: undefined,
		instructor: undefined,
		year: undefined,
		page: 1,
	};
}

/** Állapot → `GET /api/events` query (felülírható lap és lapméret, pl. az exporthoz). */
export function toEventsApiQuery(
	state: EventListState,
	overrides: { page?: number; pageSize?: number } = {},
): URLSearchParams {
	const params = new URLSearchParams();
	params.set("page", String(overrides.page ?? state.page));
	params.set("pageSize", String(overrides.pageSize ?? state.pageSize));
	if (state.q) params.set("q", state.q);
	for (const tag of state.tags) params.append("tags", tag);
	if (state.place) params.set("place", state.place);
	if (state.companyName) params.set("companyName", state.companyName);
	if (state.instructor) params.set("instructor", state.instructor);
	if (state.year !== undefined) params.set("year", String(state.year));
	if (state.tab !== "all") params.set("phase", state.tab);
	params.set("sort", state.sort);
	params.set("order", state.order);
	return params;
}
