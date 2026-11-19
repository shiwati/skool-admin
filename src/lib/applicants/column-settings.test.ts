import { afterEach, describe, expect, it, vi } from "vitest";
import {
	COLUMN_IDS,
	COLUMN_SETTINGS_KEY,
	DEFAULT_COLUMN_SETTINGS,
	loadColumnSettings,
	moveColumn,
	normalizeColumnSettings,
	saveColumnSettings,
	setColumnVisible,
	visibleColumns,
} from "./column-settings";

describe("normalizeColumnSettings", () => {
	it("returns the defaults for missing or malformed values", () => {
		expect(normalizeColumnSettings(null)).toEqual(DEFAULT_COLUMN_SETTINGS);
		expect(normalizeColumnSettings("nope")).toEqual(
			DEFAULT_COLUMN_SETTINGS,
		);
		expect(normalizeColumnSettings({ order: "x" })).toEqual(
			DEFAULT_COLUMN_SETTINGS,
		);
	});

	it("drops unknown ids and never hides the name column", () => {
		const result = normalizeColumnSettings({
			order: ["bogus", ...COLUMN_IDS],
			hidden: ["name", "bogus", "newsletter"],
		});
		expect(result.order).toEqual([...COLUMN_IDS]);
		expect(result.hidden).toEqual(["newsletter"]);
	});

	it("re-inserts missing columns after their default predecessor", () => {
		const result = normalizeColumnSettings({
			order: ["status", "name"],
			hidden: [],
		});
		expect(result.order).toEqual([
			"status",
			"location",
			"newsletter",
			"history",
			"createdAt",
			"parent",
			"phone",
			"name",
			"age",
			"program",
		]);
		expect(new Set(result.order).size).toBe(COLUMN_IDS.length);
	});
});

describe("column edits", () => {
	it("shows and hides columns, except the locked one", () => {
		const shown = setColumnVisible(DEFAULT_COLUMN_SETTINGS, "phone", true);
		expect(visibleColumns(shown)).toContain("phone");
		const hidden = setColumnVisible(shown, "newsletter", false);
		expect(visibleColumns(hidden)).not.toContain("newsletter");
		expect(setColumnVisible(hidden, "name", false)).toBe(hidden);
	});

	it("moves a column to a new position, clamped to the ends", () => {
		const up = moveColumn(DEFAULT_COLUMN_SETTINGS, "newsletter", 4);
		expect(up.order.slice(3, 6)).toEqual([
			"status",
			"newsletter",
			"location",
		]);
		expect(moveColumn(DEFAULT_COLUMN_SETTINGS, "age", -5).order[0]).toBe(
			"age",
		);
		expect(
			moveColumn(DEFAULT_COLUMN_SETTINGS, "age", 99).order.at(-1),
		).toBe("age");
	});
});

describe("storage", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		window.localStorage.clear();
	});

	it("round-trips through localStorage", () => {
		const settings = setColumnVisible(
			DEFAULT_COLUMN_SETTINGS,
			"phone",
			true,
		);
		saveColumnSettings(settings);
		expect(
			JSON.parse(window.localStorage.getItem(COLUMN_SETTINGS_KEY)!),
		).toEqual(settings);
		expect(loadColumnSettings()).toEqual(settings);
	});

	it("falls back to the defaults for corrupt JSON", () => {
		window.localStorage.setItem(COLUMN_SETTINGS_KEY, "{not json");
		expect(loadColumnSettings()).toEqual(DEFAULT_COLUMN_SETTINGS);
	});

	it("survives a storage that throws", () => {
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new Error("blocked");
		});
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new Error("blocked");
		});
		expect(loadColumnSettings()).toEqual(DEFAULT_COLUMN_SETTINGS);
		expect(() => saveColumnSettings(DEFAULT_COLUMN_SETTINGS)).not.toThrow();
	});
});
