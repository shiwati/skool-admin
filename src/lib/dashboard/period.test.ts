import { describe, expect, it } from "vitest";
import { periodOptions, resolvePeriod } from "./period";

const now = new Date("2026-11-19T10:00:00Z");

describe("dashboard period", () => {
	it("offers this year and last year when there is no older program", () => {
		expect(periodOptions(now).map((o) => o.key)).toEqual(["2026", "2025"]);
		expect(periodOptions(now, null).map((o) => o.key)).toEqual([
			"2026",
			"2025",
		]);
		expect(periodOptions(now, 2026).map((o) => o.key)).toEqual([
			"2026",
			"2025",
		]);
	});

	it("offers every year back to the first program", () => {
		expect(periodOptions(now, 2023)).toEqual([
			{ key: "2026", label: "2026 (idei év)" },
			{ key: "2025", label: "2025" },
			{ key: "2024", label: "2024" },
			{ key: "2023", label: "2023" },
		]);
	});

	it("resolves an older year when programs reach back to it", () => {
		const period = resolvePeriod("2024", now, 2024);
		expect(period.key).toBe("2024");
		expect(period.previousLabel).toBe("2023");
		expect(resolvePeriod("2024", now).key).toBe("2026");
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
