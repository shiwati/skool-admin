import { describe, expect, it } from "vitest";
import { safeCallbackPath } from "./callback-url";

const base = "http://localhost:3000";

describe("safeCallbackPath", () => {
	it.each([
		["/", "/"],
		["/applicants?page=2#top", "/applicants?page=2#top"],
		["http://localhost:3000/programs", "/programs"],
		[["/reports", "/other"], "/reports"],
	])("keeps same-origin %j as %s", (value, expected) => {
		expect(safeCallbackPath(value, base)).toBe(expected);
	});

	it.each([
		undefined,
		"",
		"https://evil.example/",
		"//evil.example/",
		"/\\evil.example/",
		"javascript:alert(1)",
		"applicants",
		"http://localhost:3001/",
	])("falls back for %j", (value) => {
		expect(safeCallbackPath(value, base)).toBe("/");
	});
});
