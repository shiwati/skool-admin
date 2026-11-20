import { PAGE_SIZES, type PageSize } from "@/lib/applicants/list-params";
import { EVENT_PHASES, type EventPhase } from "./phase";
import { isEventTag, type EventTag } from "./tags";

/**
 * A `/events` lista URL-állapota (kliensről is importálható). Az URL az
 * egyetlen igazságforrás: érvénytelen értékek csendben az alapértékre esnek.
 */

export const EVENT_SORT_KEYS = ["from", "name", "capacity"] as const;
export type EventSortKey = (typeof EVENT_SORT_KEYS)[number];
export type SortOrder = "asc" | "desc";

export type EventTab = EventPhase | "all";
export const EVENT_TABS: EventTab[] = ["all", ...EVENT_PHASES];

export type EventListFilters = {
	q?: string;
	tags: EventTag[];
	place?: string;
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

function oneOf<T extends string>(
	values: readonly T[],
	value: string | null,
): T | undefined {
	return values.find((v) => v === value);
}

function positiveInt(value: string | null) {
	if (value === null || !/^\d+$/.test(value)) return undefined;
	const n = Number(value);
	return n >= 1 ? n : undefined;
}

export function parseEventListState(params: URLSearchParams): EventListState {
	const sort = oneOf(EVENT_SORT_KEYS, params.get("sort")) ?? "from";
	const year = positiveInt(params.get("year"));
	const size = positiveInt(params.get("pageSize"));
	return {
		tab: oneOf(EVENT_TABS, params.get("tab")) ?? DEFAULT_TAB,
		q: text(params.get("q")),
		tags: [...new Set(params.getAll("tags"))].filter(isEventTag),
		place: text(params.get("place")),
		instructor: text(params.get("instructor")),
		year: year && year >= 2000 && year <= 2100 ? year : undefined,
		sort,
		order:
			oneOf(["asc", "desc"] as const, params.get("order")) ??
			defaultOrder(sort),
		page: positiveInt(params.get("page")) ?? 1,
		pageSize: PAGE_SIZES.find((n) => n === size) ?? DEFAULT_PAGE_SIZE,
	};
}

/** Állapot → URL query; az alapértékek kimaradnak, hogy rövid maradjon. */
export function toEventSearchParams(state: EventListState): URLSearchParams {
	const params = new URLSearchParams();
	if (state.tab !== DEFAULT_TAB) params.set("tab", state.tab);
	if (state.q) params.set("q", state.q);
	for (const tag of state.tags) params.append("tags", tag);
	if (state.place) params.set("place", state.place);
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
	const resetsPage = Object.keys(patch).some((key) => key !== "page");
	return { ...state, ...(resetsPage && { page: 1 }), ...patch };
}

export function hasActiveEventFilters(filters: EventListFilters): boolean {
	return Boolean(
		filters.q ||
		filters.tags.length ||
		filters.place ||
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
	if (state.instructor) params.set("instructor", state.instructor);
	if (state.year !== undefined) params.set("year", String(state.year));
	if (state.tab !== "all") params.set("phase", state.tab);
	params.set("sort", state.sort);
	params.set("order", state.order);
	return params;
}

/** Állapot → `eventsQuerySchema` bemenete (a szerver oldali lekéréshez). */
export function toEventsQueryInput(state: EventListState) {
	return {
		page: state.page,
		pageSize: state.pageSize,
		q: state.q,
		tags: state.tags.length ? state.tags : undefined,
		place: state.place,
		instructor: state.instructor,
		year: state.year,
		phase: state.tab === "all" ? undefined : state.tab,
		sort: state.sort,
		order: state.order,
	};
}
