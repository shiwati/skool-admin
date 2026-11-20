import { describe, expect, it } from "vitest";
import {
	ageRangeError,
	clearFilters,
	DEFAULT_STATE,
	hasActiveFilters,
	parseListState,
	toApiQuery,
	toSearchParams,
	updateListState,
	type ListState,
} from "./list-params";

const parse = (qs: string) => parseListState(new URLSearchParams(qs));

describe("parseListState", () => {
	it("returns the defaults for an empty URL", () => {
		expect(parse("")).toEqual({
			...DEFAULT_STATE,
			q: undefined,
			ageFrom: undefined,
			ageTo: undefined,
			hometown: undefined,
			newsletter: undefined,
			attended: undefined,
		});
	});

	it("falls back to defaults for invalid values", () => {
		const state = parse(
			"sort=bogus&order=up&page=-3&pageSize=7&ageFrom=abc&newsletter=maybe&q=%20%20",
		);
		expect(state.sort).toBe("createdAt");
		expect(state.order).toBe("desc");
		expect(state.page).toBe(1);
		expect(state.pageSize).toBe(25);
		expect(state.ageFrom).toBeUndefined();
		expect(state.newsletter).toBeUndefined();
		expect(state.q).toBeUndefined();
	});

	it("reads the program year and ignores an invalid one", () => {
		expect(parse("programYear=2025").programYear).toBe(2025);
		expect(parse("programYear=abc").programYear).toBeUndefined();
		expect(parse("programYear=1800").programYear).toBeUndefined();
	});

	it("drops an inverted age range", () => {
		const state = parse("ageFrom=15&ageTo=10");
		expect(state.ageFrom).toBeUndefined();
		expect(state.ageTo).toBeUndefined();
	});

	it("accepts comma separated and repeated program ids, deduplicated", () => {
		expect(parse("eventIds=e1,e2&eventIds=e2,e3").eventIds).toEqual([
			"e1",
			"e2",
			"e3",
		]);
	});

	it("defaults the order by column when only sort is given", () => {
		expect(parse("sort=name").order).toBe("asc");
		expect(parse("sort=createdAt").order).toBe("desc");
	});
});

describe("toSearchParams", () => {
	it("omits default values", () => {
		expect(toSearchParams(DEFAULT_STATE).toString()).toBe("");
	});

	it("round-trips a full state through the URL", () => {
		const state: ListState = {
			q: "kiss p",
			eventIds: ["e1", "e2"],
			ageFrom: 12,
			ageTo: 16,
			hometown: "Pécs",
			newsletter: true,
			attended: false,
			sort: "age",
			order: "asc",
			page: 3,
			pageSize: 50,
		};
		expect(parseListState(toSearchParams(state))).toEqual(state);
	});
});

describe("toApiQuery", () => {
	it("maps UI sort keys to API keys", () => {
		const q = toApiQuery({ ...DEFAULT_STATE, sort: "name", order: "asc" });
		expect(q.get("sort")).toBe("lastName");
		expect(q.get("order")).toBe("asc");
		expect(
			toApiQuery({ ...DEFAULT_STATE, sort: "location" }).get("sort"),
		).toBe("hometown");
	});

	it("inverts the order for age (youngest first = birth year desc)", () => {
		const q = toApiQuery({ ...DEFAULT_STATE, sort: "age", order: "asc" });
		expect(q.get("sort")).toBe("birthYear");
		expect(q.get("order")).toBe("desc");
	});

	it("passes filters, page and page size, with overrides", () => {
		const state: ListState = {
			...DEFAULT_STATE,
			eventIds: ["e1", "e2"],
			hometown: "Győr",
			attended: true,
			page: 4,
		};
		expect(Object.fromEntries(toApiQuery(state))).toEqual({
			page: "4",
			pageSize: "25",
			sort: "createdAt",
			order: "desc",
			eventIds: "e1,e2",
			hometown: "Győr",
			attended: "true",
		});
		const all = toApiQuery(state, { page: 1, pageSize: 100 });
		expect(all.get("page")).toBe("1");
		expect(all.get("pageSize")).toBe("100");
	});
});

describe("updateListState", () => {
	const onPage3 = { ...DEFAULT_STATE, page: 3 };

	it("keeps the page when only paging", () => {
		expect(updateListState(onPage3, { page: 4 }).page).toBe(4);
	});

	it("returns to page 1 on any other change", () => {
		expect(updateListState(onPage3, { q: "anna" }).page).toBe(1);
		expect(updateListState(onPage3, { pageSize: 50 }).page).toBe(1);
		expect(updateListState(onPage3, { sort: "name" }).page).toBe(1);
	});
});

describe("filters helpers", () => {
	it("detects and clears active filters, keeping sort and size", () => {
		const state: ListState = {
			...DEFAULT_STATE,
			q: "x",
			newsletter: false,
			sort: "name",
			order: "asc",
			pageSize: 50,
			page: 2,
		};
		expect(hasActiveFilters(state)).toBe(true);
		const cleared = clearFilters(state);
		expect(hasActiveFilters(cleared)).toBe(false);
		expect(cleared).toMatchObject({ sort: "name", pageSize: 50, page: 1 });
		expect(hasActiveFilters(DEFAULT_STATE)).toBe(false);
	});

	it("reports an inverted age range", () => {
		expect(ageRangeError(16, 12)).toMatch(/minimum/);
		expect(ageRangeError(12, 16)).toBeNull();
		expect(ageRangeError(undefined, 3)).toBeNull();
	});
});
