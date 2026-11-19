import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
	ageRangeToBirthYear,
	budapestYearRange,
	csvList,
	searchParamsToObject,
	searchTokens,
} from "./query";

describe("csvList", () => {
	const schema = csvList(z.string());
	it("splits comma separated and repeated values", () => {
		expect(schema.parse("a, b")).toEqual(["a", "b"]);
		expect(schema.parse(["a", "b,c"])).toEqual(["a", "b", "c"]);
	});
	it("treats empty input as missing", () => {
		expect(schema.parse(undefined)).toBeUndefined();
		expect(schema.parse(" , ")).toBeUndefined();
	});
});

describe("searchParamsToObject", () => {
	it("collects repeated keys into arrays", () => {
		expect(
			searchParamsToObject(new URLSearchParams("a=1&a=2&b=3")),
		).toEqual({
			a: ["1", "2"],
			b: "3",
		});
	});
});

it("searchTokens splits on whitespace", () => {
	expect(searchTokens("  Kiss   Péter ")).toEqual(["Kiss", "Péter"]);
	expect(searchTokens(undefined)).toEqual([]);
});

describe("ageRangeToBirthYear", () => {
	const now = new Date("2026-06-01");
	it("maps age bounds to birth year bounds", () => {
		expect(ageRangeToBirthYear(10, 14, now)).toEqual({
			lte: 2016,
			gte: 2012,
		});
		expect(ageRangeToBirthYear(10, undefined, now)).toEqual({ lte: 2016 });
		expect(ageRangeToBirthYear(undefined, undefined, now)).toBeUndefined();
	});
});

it("budapestYearRange uses CET boundaries", () => {
	expect(budapestYearRange(2026)).toEqual({
		gte: new Date("2025-12-31T23:00:00Z"),
		lt: new Date("2026-12-31T23:00:00Z"),
	});
});
