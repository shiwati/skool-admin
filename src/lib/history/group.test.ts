import { describe, expect, it } from "vitest";
import { formatDayLabel, groupByDay } from "./group";
import { formatTime } from "@/lib/format";

const now = new Date("2026-11-19T12:00:00Z");

describe("history grouping", () => {
	it("labels today, yesterday and older days in Budapest time", () => {
		expect(formatDayLabel(new Date("2026-11-19T06:00:00Z"), now)).toBe(
			"Ma",
		);
		// 23:30 UTC on the 18th is already the 19th in Budapest.
		expect(formatDayLabel(new Date("2026-11-18T23:30:00Z"), now)).toBe(
			"Ma",
		);
		expect(formatDayLabel(new Date("2026-11-18T10:00:00Z"), now)).toBe(
			"Tegnap",
		);
		expect(formatDayLabel(new Date("2026-11-03T10:00:00Z"), now)).toBe(
			"2026. november 3.",
		);
	});

	it("formats the time of day in Budapest time", () => {
		expect(formatTime(new Date("2026-11-19T09:12:00Z"))).toBe("10:12");
	});

	it("groups consecutive entries of the same day, keeping order", () => {
		const items = [
			{ id: "a", createdAt: new Date("2026-11-19T10:00:00Z") },
			{ id: "b", createdAt: new Date("2026-11-19T08:00:00Z") },
			{ id: "c", createdAt: new Date("2026-11-03T14:44:00Z") },
		];
		const groups = groupByDay(items, now);
		expect(groups.map((g) => [g.label, g.items.map((i) => i.id)])).toEqual([
			["Ma", ["a", "b"]],
			["2026. november 3.", ["c"]],
		]);
	});

	it("returns no groups for no entries", () => {
		expect(groupByDay([], now)).toEqual([]);
	});
});
