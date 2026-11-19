import { describe, expect, it } from "vitest";
import { buildDuplicatePairs, pairKey } from "./duplicate-pairs";

const c = (id: string, key: string, day: number) => ({
	id,
	duplicateKey: key,
	createdAt: new Date(Date.UTC(2026, 0, day)),
});

describe("buildDuplicatePairs", () => {
	it("pairs applicants with the same key, older first", () => {
		const pairs = buildDuplicatePairs(
			[c("b", "k", 2), c("a", "k", 1), c("x", "other", 3)],
			new Set(),
		);
		expect(pairs).toEqual([{ aId: "a", bId: "b" }]);
	});

	it("emits every pair of a larger group, groups by oldest member", () => {
		const pairs = buildDuplicatePairs(
			[
				c("z2", "z", 5),
				c("k1", "k", 2),
				c("k2", "k", 3),
				c("k3", "k", 4),
				c("z1", "z", 1),
			],
			new Set(),
		);
		expect(pairs).toEqual([
			{ aId: "z1", bId: "z2" },
			{ aId: "k1", bId: "k2" },
			{ aId: "k1", bId: "k3" },
			{ aId: "k2", bId: "k3" },
		]);
	});

	it("skips dismissed pairs but keeps new pairs with a later applicant", () => {
		const pairs = buildDuplicatePairs(
			[c("a", "k", 1), c("b", "k", 2), c("new", "k", 3)],
			new Set([pairKey("b", "a")]),
		);
		expect(pairs).toEqual([
			{ aId: "a", bId: "new" },
			{ aId: "b", bId: "new" },
		]);
	});
});

describe("pairKey", () => {
	it("is order independent", () => {
		expect(pairKey("x", "y")).toBe(pairKey("y", "x"));
	});
});
