import { describe, expect, it } from "vitest";
import { eventStatus } from "./phase";

const now = new Date("2026-11-19T12:00:00Z");
const upcoming = {
	from: "2026-12-01T09:00:00Z",
	to: "2026-12-01T15:00:00Z",
	sheetUrl: "https://docs.google.com/spreadsheets/d/x",
	capacity: 20,
	applications: 5,
};

describe("eventStatus", () => {
	it("is closed after the end and running between the dates", () => {
		expect(
			eventStatus({ ...upcoming, to: "2026-11-18T10:00:00Z" }, now),
		).toBe("closed");
		expect(
			eventStatus({ ...upcoming, from: "2026-11-19T08:00:00Z" }, now),
		).toBe("running");
	});

	it("is planned for upcoming events without a sheet", () => {
		expect(eventStatus({ ...upcoming, sheetUrl: null }, now)).toBe(
			"planned",
		);
	});

	it("is full when applications reach the capacity", () => {
		expect(eventStatus({ ...upcoming, applications: 20 }, now)).toBe(
			"full",
		);
		expect(eventStatus(upcoming, now)).toBe("open");
		expect(
			eventStatus({ ...upcoming, capacity: 0, applications: 50 }, now),
		).toBe("open");
	});
});
