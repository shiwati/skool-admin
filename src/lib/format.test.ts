import { describe, expect, it } from "vitest";
import {
	budapestDayKey,
	EMPTY,
	formatDate,
	formatDateTime,
	formatLongDate,
	formatRatio,
	formatTime,
} from "./format";

describe("shared formatters", () => {
	it("formats dates and times in Budapest time", () => {
		// 23:30 UTC is already the next day in Budapest.
		const late = new Date("2026-11-20T23:30:00Z");
		expect(budapestDayKey(late)).toBe("2026-11-21");
		expect(formatDate(late)).toBe("2026.11.21");
		expect(formatTime(late)).toBe("00:30");
		expect(formatDateTime(late)).toBe("2026.11.21 00:30");
		expect(formatLongDate(late)).toBe("2026. november 21.");
	});

	it("shows the empty mark for an invalid date", () => {
		expect(formatDate("not a date")).toBe(EMPTY);
		expect(formatDateTime("not a date")).toBe(EMPTY);
	});

	it("formats ratios with one decimal and a decimal comma", () => {
		expect(formatRatio(3.14)).toBe("3,1×");
		expect(formatRatio(2)).toBe("2,0×");
	});
});
