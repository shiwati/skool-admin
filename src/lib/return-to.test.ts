import { describe, expect, it } from "vitest";
import { returnToFromHeader } from "./return-to";

describe("returnToFromHeader", () => {
	it("keeps same-origin paths with their query", () => {
		expect(returnToFromHeader("/applicants?page=2")).toBe(
			"/applicants?page=2",
		);
	});

	it("falls back to / for missing or unsafe values", () => {
		expect(returnToFromHeader(null)).toBe("/");
		expect(returnToFromHeader("//evil.example/x")).toBe("/");
		expect(returnToFromHeader("https://evil.example/")).toBe("/");
		expect(returnToFromHeader("/\\evil.example/x")).toBe("/");
		expect(returnToFromHeader("javascript:alert(1)")).toBe("/");
	});
});
