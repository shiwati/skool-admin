import { describe, expect, it } from "vitest";
import { EVENT_TAGS, eventTagSchema, isEventTag } from "./tags";

describe("event tags", () => {
	it("has unique, trimmed, non-empty values", () => {
		expect(new Set(EVENT_TAGS).size).toBe(EVENT_TAGS.length);
		for (const tag of EVENT_TAGS) {
			expect(tag).not.toBe("");
			expect(tag.trim()).toBe(tag);
		}
	});

	it("recognises listed tags only", () => {
		expect(isEventTag(EVENT_TAGS[0])).toBe(true);
		expect(isEventTag("nemletezik")).toBe(false);
		expect(isEventTag(42)).toBe(false);
	});

	it("is case-sensitive, since values come from the same constant", () => {
		expect(
			eventTagSchema.safeParse(EVENT_TAGS[0].toUpperCase()).success,
		).toBe(false);
	});
});
