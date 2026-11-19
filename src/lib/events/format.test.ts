import { describe, expect, it } from "vitest";
import {
	demandRatio,
	formatDateRange,
	formatRatio,
	ratioBadgeClass,
} from "./format";

describe("formatDateRange", () => {
	it("starts with the year", () => {
		expect(
			formatDateRange("2026-11-21T09:00:00Z", "2026-12-12T15:00:00Z"),
		).toBe("2026.11.21 – 12.12");
	});

	it("shows a single date for one-day events", () => {
		expect(
			formatDateRange("2026-11-16T09:00:00Z", "2026-11-16T15:00:00Z"),
		).toBe("2026.11.16");
	});

	it("adds the year to the end of year-crossing ranges", () => {
		expect(
			formatDateRange("2026-12-30T08:00:00Z", "2027-01-02T15:00:00Z"),
		).toBe("2026.12.30 – 2027.01.02");
	});

	it("uses Budapest dates", () => {
		// 23:30 UTC is already the next day in Budapest.
		expect(
			formatDateRange("2026-11-20T23:30:00Z", "2026-11-21T10:00:00Z"),
		).toBe("2026.11.21");
	});
});

describe("demand ratio", () => {
	it("is null without capacity", () => {
		expect(demandRatio(10, 0)).toBeNull();
	});

	it("formats with a decimal comma and picks the tone", () => {
		const ratio = demandRatio(62, 20)!;
		expect(formatRatio(ratio)).toBe("3,1×");
		expect(ratioBadgeClass(ratio)).toBe("bg-coral");
		expect(ratioBadgeClass(1.6)).toBe("bg-peach");
		expect(ratioBadgeClass(0.9)).toBe("bg-sage");
	});
});
