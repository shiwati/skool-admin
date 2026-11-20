// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
	ApplicationsNotFoundError,
	updateApplicationStatuses,
} from "./update-status";

function setup(found: { id: string; status: string }[]) {
	const tx = {
		application: {
			findMany: vi.fn().mockResolvedValue(found),
			updateMany: vi.fn().mockResolvedValue({ count: 0 }),
		},
		history: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
	};
	const db = {
		$transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
	};
	return { tx, db: db as never };
}

const now = new Date("2026-11-20T10:00:00Z");

describe("updateApplicationStatuses", () => {
	it("updates only changing rows and logs one history row each", async () => {
		const { tx, db } = setup([
			{ id: "a1", status: "APPLIED" },
			{ id: "a2", status: "ACCEPTED" },
		]);
		const result = await updateApplicationStatuses(
			db,
			"e1",
			["a1", "a2"],
			"ACCEPTED",
			"u1",
			now,
		);
		expect(result).toEqual({ updated: 1, skipped: 1 });
		expect(tx.application.findMany.mock.calls[0][0].where).toEqual({
			id: { in: ["a1", "a2"] },
			eventId: "e1",
		});
		expect(tx.application.updateMany).toHaveBeenCalledWith({
			where: { id: { in: ["a1"] }, eventId: "e1" },
			data: { status: "ACCEPTED", updatedById: "u1" },
		});
		expect(tx.history.createMany).toHaveBeenCalledWith({
			data: [
				{
					tableName: "application",
					fieldName: "status",
					recordId: "a1",
					oldValue: "APPLIED",
					newValue: "ACCEPTED",
					createdById: "u1",
					createdAt: now,
				},
			],
		});
	});

	it("writes nothing when every row already has the status", async () => {
		const { tx, db } = setup([{ id: "a1", status: "REJECTED" }]);
		const result = await updateApplicationStatuses(
			db,
			"e1",
			["a1"],
			"REJECTED",
			"u1",
		);
		expect(result).toEqual({ updated: 0, skipped: 1 });
		expect(tx.application.updateMany).not.toHaveBeenCalled();
		expect(tx.history.createMany).not.toHaveBeenCalled();
	});

	it("throws when an id is unknown or belongs to another event", async () => {
		const { tx, db } = setup([{ id: "a1", status: "APPLIED" }]);
		await expect(
			updateApplicationStatuses(db, "e1", ["a1", "x"], "ACCEPTED", "u1"),
		).rejects.toBeInstanceOf(ApplicationsNotFoundError);
		expect(tx.application.updateMany).not.toHaveBeenCalled();
	});
});
