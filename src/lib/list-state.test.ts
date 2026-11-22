import { describe, expect, it } from "vitest";
import {
	apiSort,
	MAX_PAGE,
	oneOf,
	parseOrder,
	parsePage,
	parsePageSize,
	toURLSearchParams,
	withPageReset,
} from "./list-state";

describe("list URL state helpers", () => {
	it("parses the page, falling back to 1", () => {
		expect(parsePage("3")).toBe(3);
		for (const value of [null, undefined, "", "0", "-2", "1.5", "x"]) {
			expect(parsePage(value)).toBe(1);
		}
		expect(parsePage(String(MAX_PAGE))).toBe(MAX_PAGE);
		expect(parsePage(String(MAX_PAGE + 1))).toBe(1);
	});

	it("accepts only the offered page sizes", () => {
		expect(parsePageSize("50", 25)).toBe(50);
		expect(parsePageSize("7", 25)).toBe(25);
		expect(parsePageSize(null, 10)).toBe(10);
	});

	it("parses the order and picks known values", () => {
		expect(parseOrder("asc", "desc")).toBe("asc");
		expect(parseOrder("up", "desc")).toBe("desc");
		expect(oneOf(["a", "b"] as const, "b")).toBe("b");
		expect(oneOf(["a", "b"] as const, "c")).toBeUndefined();
	});

	it("returns to page 1 on any change but paging", () => {
		const state = { page: 4, q: "x" };
		expect(withPageReset(state, { page: 5 })).toEqual({ page: 5, q: "x" });
		expect(withPageReset(state, { q: "y" })).toEqual({ page: 1, q: "y" });
		expect(withPageReset(state, { q: "y", page: 3 }).page).toBe(1);
	});

	it("maps a UI sort to the API, flipping inverted keys", () => {
		const map = {
			name: { key: "lastName", invert: false },
			age: { key: "birthYear", invert: true },
		};
		expect(apiSort(map, "name", "asc")).toEqual({
			sort: "lastName",
			order: "asc",
		});
		expect(apiSort(map, "age", "asc")).toEqual({
			sort: "birthYear",
			order: "desc",
		});
	});

	it("keeps every value of repeated Next search params", () => {
		const params = toURLSearchParams({
			tags: ["a", "b"],
			q: "x",
			none: undefined,
		});
		expect(params.getAll("tags")).toEqual(["a", "b"]);
		expect(params.get("q")).toBe("x");
		expect(params.has("none")).toBe(false);
	});
});
