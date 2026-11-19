import { describe, expect, it } from "vitest";
import { periodOptions, resolvePeriod } from "./period";

const now = new Date("2026-11-19T10:00:00Z");

describe("dashboard period", () => {
	it("offers this year and last year only", () => {
		expect(periodOptions(now).map((o) => o.key)).toEqual(["2026", "2025"]);
	});

	it("defaults to this year and compares it with the previous year", () => {
		const period = resolvePeriod(undefined, now);
		expect(period.key).toBe("2026");
		expect(period.range).toEqual({
			gte: new Date("2025-12-31T23:00:00Z"),
			lt: new Date("2026-12-31T23:00:00Z"),
		});
		expect(period.previous.gte).toEqual(new Date("2024-12-31T23:00:00Z"));
		expect(period.previousLabel).toBe("2025");
	});

	it("compares last year with the year before", () => {
		const period = resolvePeriod("2025", now);
		expect(period.range.gte).toEqual(new Date("2024-12-31T23:00:00Z"));
		expect(period.previousLabel).toBe("2024");
	});

	it("falls back to this year for unknown keys", () => {
		expect(resolvePeriod("1999", now).key).toBe("2026");
		expect(resolvePeriod("last12", now).key).toBe("2026");
	});
});
