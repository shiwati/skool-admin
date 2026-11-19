import { describe, expect, it } from "vitest";
import {
	ageAtEvent,
	ageDistribution,
	budapestYear,
	capacityRows,
	formatRatio,
	formatSignedDecimal,
	formatSignedPercent,
	greeting,
	hometownDistribution,
	lastMonths,
	monthlyOversubscription,
	oversubscription,
	percentChange,
	type EventStat,
} from "./compute";

const event = (overrides: Partial<EventStat>): EventStat => ({
	id: "e",
	name: "Program",
	from: new Date("2026-03-10T09:00:00Z"),
	to: new Date("2026-03-12T16:00:00Z"),
	capacity: 10,
	applications: 0,
	...overrides,
});

describe("budapestYear", () => {
	it("uses Budapest time at the new-year boundary", () => {
		expect(budapestYear(new Date("2025-12-31T23:30:00Z"))).toBe(2026);
		expect(budapestYear(new Date("2025-12-31T22:30:00Z"))).toBe(2025);
	});
});

describe("greeting", () => {
	it("follows Budapest hours", () => {
		expect(greeting(new Date("2026-11-19T07:00:00Z"))).toBe("Jó reggelt");
		expect(greeting(new Date("2026-11-19T12:00:00Z"))).toBe("Szép napot");
		expect(greeting(new Date("2026-11-19T19:00:00Z"))).toBe("Jó estét");
	});
});

describe("oversubscription", () => {
	it("divides all applications by all capacity, skipping events without capacity", () => {
		expect(
			oversubscription([
				event({ capacity: 20, applications: 62 }),
				event({ capacity: 30, applications: 38 }),
				event({ capacity: 0, applications: 100 }),
			]),
		).toBe(2);
	});

	it("is null without capacity", () => {
		expect(oversubscription([])).toBeNull();
		expect(oversubscription([event({ capacity: 0 })])).toBeNull();
	});
});

describe("percentChange", () => {
	it("compares to the previous value, null when there is none", () => {
		expect(percentChange(118, 100)).toBeCloseTo(18);
		expect(percentChange(5, 0)).toBeNull();
	});
});

describe("capacityRows", () => {
	it("sorts newest first and marks ended events as past", () => {
		const now = new Date("2026-06-01T00:00:00Z");
		const rows = capacityRows(
			[
				event({
					id: "old",
					from: new Date("2026-01-01"),
					to: new Date("2026-01-02"),
					capacity: 20,
					applications: 30,
				}),
				event({
					id: "new",
					from: new Date("2026-09-01"),
					to: new Date("2026-09-02"),
					capacity: 0,
					applications: 4,
				}),
			],
			now,
		);
		expect(rows).toEqual([
			expect.objectContaining({
				id: "new",
				state: "upcoming",
				ratio: null,
			}),
			expect.objectContaining({ id: "old", state: "past", ratio: 1.5 }),
		]);
	});
});

describe("monthly oversubscription", () => {
	it("lists the last months oldest first, across the year boundary", () => {
		expect(lastMonths(new Date("2026-02-15T12:00:00Z"), 4)).toEqual([
			{ key: "2025-11", label: "nov" },
			{ key: "2025-12", label: "dec" },
			{ key: "2026-01", label: "jan" },
			{ key: "2026-02", label: "febr" },
		]);
	});

	it("buckets events by their Budapest start month", () => {
		const now = new Date("2026-11-19T12:00:00Z");
		const points = monthlyOversubscription(
			[
				// 2026-10-31 23:30 UTC is already November in Budapest.
				event({
					from: new Date("2026-10-31T23:30:00Z"),
					capacity: 10,
					applications: 25,
				}),
				event({
					from: new Date("2026-11-05T09:00:00Z"),
					capacity: 10,
					applications: 5,
				}),
				event({
					from: new Date("2026-07-01T09:00:00Z"),
					capacity: 20,
					applications: 60,
				}),
				// Outside the window and without capacity: ignored.
				event({ from: new Date("2026-01-10T09:00:00Z"), capacity: 5 }),
				event({
					from: new Date("2026-08-10T09:00:00Z"),
					capacity: 0,
					applications: 9,
				}),
			],
			now,
		);
		expect(points.map((p) => [p.key, p.ratio])).toEqual([
			["2026-06", null],
			["2026-07", 3],
			["2026-08", null],
			["2026-09", null],
			["2026-10", null],
			["2026-11", 1.5],
		]);
	});
});

describe("ageDistribution", () => {
	it("buckets ages", () => {
		expect(ageDistribution([12, 11, 14, 17, 26, null, 7])).toEqual([
			{ label: "10 alatt", count: 1 },
			{ label: "10–12", count: 2 },
			{ label: "13–15", count: 1 },
			{ label: "16–18", count: 1 },
			{ label: "19+", count: 1 },
			{ label: "Nincs adat", count: 1 },
		]);
	});

	it("keeps the core buckets even when empty", () => {
		expect(ageDistribution([]).map((r) => r.label)).toEqual([
			"10–12",
			"13–15",
			"16–18",
			"19+",
		]);
	});
});

describe("hometownDistribution", () => {
	it("merges spellings, keeps the top N and groups the rest", () => {
		expect(
			hometownDistribution(
				[
					"Budapest",
					" budapest ",
					"Budapest",
					"Ózd",
					"ózd",
					"Eger",
					"Pécs",
					null,
					"  ",
				],
				2,
			),
		).toEqual([
			{ label: "Budapest", count: 3 },
			{ label: "Ózd", count: 2 },
			{ label: "Egyéb", count: 2 },
			{ label: "Nincs adat", count: 2 },
		]);
	});
});

describe("formatting", () => {
	it("formats ratios and signed values in Hungarian", () => {
		expect(formatRatio(2.43)).toBe("2,4×");
		expect(formatSignedDecimal(0.3)).toBe("+0,3");
		expect(formatSignedDecimal(-0.26)).toBe("−0,3");
		expect(formatSignedDecimal(0.01)).toBe("±0,0");
		expect(formatSignedPercent(18.2)).toBe("+18%");
		expect(formatSignedPercent(-4.6)).toBe("−5%");
	});
});

describe("ageAtEvent", () => {
	it("uses the Budapest start year of the event", () => {
		expect(ageAtEvent(2012, new Date("2025-12-31T23:30:00Z"))).toBe(14);
		expect(ageAtEvent(null, new Date("2026-03-01"))).toBeNull();
	});
});
