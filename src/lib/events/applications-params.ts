import {
	apiSort,
	oneOf,
	parseOrder,
	parsePage,
	parsePageSize,
	withPageReset,
	type ApiSortMap,
	type PageSize,
	type SortOrder,
} from "@/lib/list-state";
import {
	APPLICATION_STATUSES,
	type ApplicationStatus,
} from "@/lib/applicants/types";

/**
 * A program Jelentkezők fülének nézete, és annak leképezése az URL-re és a
 * `GET /api/events/[id]/applicants` query-re. Tiszta modul: a kliens, a
 * szerver és a teszt is használja. A rendezési kulcsok a Jelentkezők lista
 * nevei (`list-params.ts`).
 */

export const APPLICATIONS_SORT_KEYS = [
	"name",
	"age",
	"status",
	"receivedAt",
] as const;
export type ApplicationsSortKey = (typeof APPLICATIONS_SORT_KEYS)[number];

export type ApplicationsView = {
	status: ApplicationStatus | null;
	sort: ApplicationsSortKey;
	order: SortOrder;
	page: number;
	pageSize: PageSize;
};

/** Alapnézet: minden státusz, a legrégebbi jelentkezés elöl, 25 soros oldal. */
export const DEFAULT_APPLICATIONS_VIEW: ApplicationsView = {
	status: null,
	sort: "receivedAt",
	order: "asc",
	page: 1,
	pageSize: 25,
};

/** URL-kulcs → API `sort`. A kor fordítva rendez: fiatalabb = nagyobb születési év. */
const API_SORT: ApiSortMap<ApplicationsSortKey> = {
	name: { key: "lastName", invert: false },
	age: { key: "birthYear", invert: true },
	status: { key: "status", invert: false },
	receivedAt: { key: "receivedAt", invert: false },
};

const D = DEFAULT_APPLICATIONS_VIEW;

/** URL → nézet. Az érvénytelen értékek csendben az alapértelmezésre esnek vissza. */
export function parseApplicationsParams(
	params: URLSearchParams,
): ApplicationsView {
	return {
		status: oneOf(APPLICATION_STATUSES, params.get("status")) ?? D.status,
		sort: oneOf(APPLICATIONS_SORT_KEYS, params.get("sort")) ?? D.sort,
		order: parseOrder(params.get("order"), D.order),
		page: parsePage(params.get("page")),
		pageSize: parsePageSize(params.get("pageSize"), D.pageSize),
	};
}

/** Nézet → URL query; az alapértékek kimaradnak. */
export function toApplicationsSearchParams(
	view: Partial<ApplicationsView>,
): URLSearchParams {
	const params = new URLSearchParams();
	if (view.status) params.set("status", view.status);
	if (view.sort !== undefined && view.sort !== D.sort)
		params.set("sort", view.sort);
	if (view.order !== undefined && view.order !== D.order)
		params.set("order", view.order);
	if (view.page !== undefined && view.page !== D.page)
		params.set("page", String(view.page));
	if (view.pageSize !== undefined && view.pageSize !== D.pageSize)
		params.set("pageSize", String(view.pageSize));
	return params;
}

/** Nézet → `GET /api/events/[id]/applicants` query (az oldal felülírható). */
export function toApplicationsApiQuery(
	view: ApplicationsView,
	overrides: { page?: number; pageSize?: number } = {},
): URLSearchParams {
	const params = new URLSearchParams({
		...apiSort(API_SORT, view.sort, view.order),
		page: String(overrides.page ?? view.page),
		pageSize: String(overrides.pageSize ?? view.pageSize),
	});
	if (view.status) params.set("status", view.status);
	return params;
}

/**
 * Állapotváltozás: a státusz, a rendezés vagy az oldalméret váltása az 1.
 * oldalra visz vissza, a lapozás nem.
 */
export function updateApplicationsView(
	view: ApplicationsView,
	patch: Partial<ApplicationsView>,
): ApplicationsView {
	return withPageReset(view, patch);
}
