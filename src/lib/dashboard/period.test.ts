import { describe, expect, it } from "vitest";
import { periodYears, resolvePeriod } from "./period";

const now = new Date("2026-11-19T10:00:00Z");

describe("dashboard period", () => {
	it("offers this year and last year when there is no older program", () => {
		expect(periodYears(now)).toEqual([2026, 2025]);
		expect(periodYears(now, null)).toEqual([2026, 2025]);
		expect(periodYears(now, 2026)).toEqual([2026, 2025]);
	});

	it("offers every year back to the first program", () => {
		expect(periodYears(now, 2023)).toEqual([2026, 2025, 2024, 2023]);
	});

	it("resolves an older year when programs reach back to it", () => {
		const period = resolvePeriod("2024", now, 2024);
		expect(period?.year).toBe(2024);
		expect(resolvePeriod("2024", now)).toBeNull();
	});

	it("defaults to all years", () => {
		expect(resolvePeriod(undefined, now)).toBeNull();
		expect(resolvePeriod("all", now)).toBeNull();
	});

	it("compares a year with the previous one", () => {
		const period = resolvePeriod("2026", now);
		expect(period?.range).toEqual({
			gte: new Date("2025-12-31T23:00:00Z"),
			lt: new Date("2026-12-31T23:00:00Z"),
		});
		expect(period?.previous.gte).toEqual(new Date("2024-12-31T23:00:00Z"));
	});

	it("compares last year with the year before", () => {
		const period = resolvePeriod("2025", now);
		expect(period?.range.gte).toEqual(new Date("2024-12-31T23:00:00Z"));
		expect(period?.previous.gte).toEqual(new Date("2023-12-31T23:00:00Z"));
	});

	it("treats unknown keys as all years", () => {
		expect(resolvePeriod("1999", now)).toBeNull();
		expect(resolvePeriod("last12", now)).toBeNull();
		expect(resolvePeriod("2026.0", now)).toBeNull();
	});
});
