import { describe, expect, it } from "vitest";
import { TAG_CLASSES, TAG_PALETTE, tagClass } from "./colors";

describe("tagClass", () => {
	it("keeps the fixed colours of the existing tags", () => {
		expect(tagClass("robotika")).toBe("bg-sky");
		expect(tagClass("programozás")).toBe("bg-lavender");
		expect(tagClass("kezdő")).toBe("bg-sage");
		expect(tagClass("haladó")).toBe("bg-peach");
		for (const [tag, cls] of Object.entries(TAG_CLASSES)) {
			expect(tagClass(tag)).toBe(cls);
		}
	});

	it("gives any other tag a stable palette colour, never grey", () => {
		const tags = ["3d nyomtatás", "élmény", "tábor", "ai", "lego", "x"];
		for (const tag of tags) {
			const cls = tagClass(tag);
			expect(TAG_PALETTE).toContain(cls);
			expect(cls).not.toBe("bg-surface-subtle");
			expect(tagClass(tag)).toBe(cls);
		}
	});

	it("spreads different tags over the palette", () => {
		const used = new Set(
			Array.from({ length: 40 }, (_, i) => tagClass(`címke ${i}`)),
		);
		expect(used.size).toBeGreaterThan(1);
	});
});
