import { describe, expect, it } from "vitest";
import { initials } from "./initials";

describe("initials", () => {
	it("uses the first and last word", () => {
		expect(initials("Kovács Anna")).toBe("KA");
		expect(initials("Nagy Luca Mária")).toBe("NM");
	});

	it("handles a single word and accented letters", () => {
		expect(initials("ádám")).toBe("Á");
	});

	it("falls back for empty names", () => {
		expect(initials("")).toBe("?");
		expect(initials(null)).toBe("?");
		expect(initials("   ")).toBe("?");
	});
});
