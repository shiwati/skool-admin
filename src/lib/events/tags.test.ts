import { describe, expect, it } from "vitest";
import {
	normalizeTag,
	searchKey,
	tagError,
	tagListSchema,
	tagSchema,
} from "./tags";

describe("normalizeTag", () => {
	it("trims, collapses inner whitespace and lowercases (Hungarian)", () => {
		expect(normalizeTag("  Robotika ")).toBe("robotika");
		expect(normalizeTag("3D   nyomtatás")).toBe("3d nyomtatás");
		expect(normalizeTag("ÉLMÉNY\tTÁBOR")).toBe("élmény tábor");
	});
});

describe("searchKey", () => {
	it("ignores case and accents", () => {
		expect(searchKey("Élmény")).toBe("elmeny");
		expect(searchKey("PROGRAMOZÁS")).toBe("programozas");
		expect(searchKey("Programozas")).toBe(searchKey("programozás"));
	});
});

describe("tagSchema", () => {
	it("accepts any well-formed tag and returns it normalized", () => {
		expect(tagSchema.parse(" Új Címke ")).toBe("új címke");
	});

	it("rejects empty, too long and comma-separated values", () => {
		expect(tagSchema.safeParse("   ").success).toBe(false);
		expect(tagSchema.safeParse("a".repeat(30)).success).toBe(true);
		expect(tagSchema.safeParse("a".repeat(31)).success).toBe(false);
		expect(tagSchema.safeParse("robotika, kezdő").success).toBe(false);
		expect(tagError("a,b")).toBe("A címke nem tartalmazhat vesszőt.");
	});
});

describe("tagListSchema", () => {
	it("removes duplicates after normalization, keeping the first order", () => {
		expect(
			tagListSchema.parse(["  Robotika ", "kezdő", "robotika"]),
		).toEqual(["robotika", "kezdő"]);
	});

	it("rejects the list when one tag is invalid", () => {
		expect(tagListSchema.safeParse(["ok", "a".repeat(31)]).success).toBe(
			false,
		);
	});
});
