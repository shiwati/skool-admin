// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { db } = vi.hoisted(() => ({
	db: {
		event: { findUnique: vi.fn() },
		application: { groupBy: vi.fn() },
		history: { findMany: vi.fn() },
	},
}));
vi.mock("@/lib/db", () => ({ db }));

import { getEventOverview, OVERVIEW_HISTORY_LIMIT } from "./overview";

const event = { id: "e1", name: "Python alapok" };

describe("getEventOverview", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		db.event.findUnique.mockResolvedValue(event);
		db.application.groupBy.mockResolvedValue([]);
		db.history.findMany.mockResolvedValue([]);
	});

	it("returns null for an unknown program without reading more", async () => {
		db.event.findUnique.mockResolvedValue(null);
		expect(await getEventOverview("gone")).toBeNull();
		expect(db.application.groupBy).not.toHaveBeenCalled();
		expect(db.history.findMany).not.toHaveBeenCalled();
	});

	it("counts applications per status and in total", async () => {
		db.application.groupBy.mockResolvedValue([
			{ status: "ACCEPTED", _count: { _all: 20 } },
			{ status: "WAITLISTED", _count: { _all: 18 } },
			{ status: "APPLIED", _count: { _all: 24 } },
			{ status: "CANCELLED", _count: { _all: 0 } },
		]);
		const overview = await getEventOverview("e1");
		expect(overview?.counts).toEqual({
			total: 62,
			APPLIED: 24,
			ACCEPTED: 20,
			REJECTED: 0,
			ATTENDED: 0,
			WAITLISTED: 18,
			CANCELLED: 0,
		});
		expect(db.application.groupBy).toHaveBeenCalledWith(
			expect.objectContaining({ where: { eventId: "e1" } }),
		);
	});

	it("has zero counts for a program without applications", async () => {
		const overview = await getEventOverview("e1");
		expect(overview?.counts.total).toBe(0);
		expect(overview?.counts.ACCEPTED).toBe(0);
	});

	it("reads only this program's latest history rows", async () => {
		const createdAt = new Date("2026-11-19T10:12:00Z");
		db.history.findMany.mockResolvedValue([
			{
				id: "h1",
				fieldName: "capacity",
				oldValue: "18",
				newValue: "20",
				createdAt,
				createdBy: { name: "Kovács Anna" },
			},
			{
				id: "h2",
				fieldName: "name",
				oldValue: "A",
				newValue: "B",
				createdAt,
				createdBy: null,
			},
		]);
		const overview = await getEventOverview("e1");
		expect(db.history.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { tableName: "event", recordId: "e1" },
				take: OVERVIEW_HISTORY_LIMIT,
			}),
		);
		expect(overview?.history).toEqual([
			{
				id: "h1",
				actor: "Kovács Anna",
				field: "capacity",
				oldValue: "18",
				newValue: "20",
				createdAt,
			},
			{
				id: "h2",
				actor: null,
				field: "name",
				oldValue: "A",
				newValue: "B",
				createdAt,
			},
		]);
	});
});
