import { describe, expect, it } from "vitest";
import {
	EVENT_HISTORY_FIELD_LABELS,
	eventHistoryFieldLabel,
	eventHistoryValue,
} from "./history-labels";
import { TRACKED_EVENT_FIELDS } from "./changes";

describe("eventHistoryFieldLabel", () => {
	it("has a Hungarian label for every tracked field", () => {
		for (const field of TRACKED_EVENT_FIELDS) {
			expect(EVENT_HISTORY_FIELD_LABELS[field]).toBeTruthy();
		}
	});

	it("labels known fields and falls back to the technical name", () => {
		expect(eventHistoryFieldLabel("capacity")).toBe("Max. tanulói létszám");
		expect(eventHistoryFieldLabel("whatever")).toBe("whatever");
	});
});

describe("eventHistoryValue", () => {
	it("keeps null (the caller shows a dash)", () => {
		expect(eventHistoryValue("name", null)).toBeNull();
	});

	it("formats dates in Budapest time", () => {
		expect(eventHistoryValue("from", "2026-11-21T09:00:00.000Z")).toBe(
			"2026.11.21 10:00",
		);
	});

	it("joins stored lists with commas and keeps non-JSON text", () => {
		expect(
			eventHistoryValue("mentors", '["Kiss Bence","Szűcs Petra"]'),
		).toBe("Kiss Bence, Szűcs Petra");
		expect(eventHistoryValue("tags", "nem json")).toBe("nem json");
	});

	it("adds the unit to the age range", () => {
		expect(eventHistoryValue("ageRange", "12-18")).toBe("12–18 év");
	});

	it("leaves other values as they are", () => {
		expect(eventHistoryValue("capacity", "20")).toBe("20");
	});
});
