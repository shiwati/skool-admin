import { describe, expect, it } from "vitest";
import {
	demandRatio,
	eventDays,
	formatDateRange,
	formatRatio,
	ratioBadgeClass,
} from "./format";

const now = new Date("2026-11-19T12:00:00Z");

describe("formatDateRange", () => {
	it("omits the year in the current year", () => {
		expect(
			formatDateRange(
				"2026-11-21T09:00:00Z",
				"2026-12-12T15:00:00Z",
				now,
			),
		).toBe("11.21 – 12.12");
	});

	it("shows a single date for one-day events", () => {
		expect(
			formatDateRange(
				"2026-11-16T09:00:00Z",
				"2026-11-16T15:00:00Z",
				now,
			),
		).toBe("11.16");
	});

	it("adds the year for other years and year-crossing ranges", () => {
		expect(
			formatDateRange(
				"2025-07-06T08:00:00Z",
				"2025-07-10T15:00:00Z",
				now,
			),
		).toBe("2025.07.06 – 07.10");
		expect(
			formatDateRange(
				"2026-12-30T08:00:00Z",
				"2027-01-02T15:00:00Z",
				now,
			),
		).toBe("2026.12.30 – 2027.01.02");
	});

	it("uses Budapest dates", () => {
		// 23:30 UTC is already the next day in Budapest.
		expect(
			formatDateRange(
				"2026-11-20T23:30:00Z",
				"2026-11-21T10:00:00Z",
				now,
			),
		).toBe("11.21");
	});
});

describe("eventDays", () => {
	it("counts touched calendar days", () => {
		expect(eventDays("2026-12-27T08:00:00Z", "2026-12-30T16:00:00Z")).toBe(
			4,
		);
		expect(eventDays("2026-11-16T08:00:00Z", "2026-11-16T09:00:00Z")).toBe(
			1,
		);
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
