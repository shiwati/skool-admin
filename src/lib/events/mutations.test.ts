// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	deleteEvent,
	EventEndBeforeStartError,
	EventNotFoundError,
	updateEvent,
} from "./mutations";

const tx = {
	event: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
	history: { create: vi.fn(), createMany: vi.fn() },
};
const db = { $transaction: (run: (t: typeof tx) => unknown) => run(tx) };

const stored = {
	id: "e1",
	name: "Python alapok",
	from: new Date("2026-11-21T09:00:00Z"),
	to: new Date("2026-11-22T15:00:00Z"),
};

describe("event mutations", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		tx.event.findUnique.mockResolvedValue(stored);
	});

	it("rejects an end before the stored start", async () => {
		await expect(
			updateEvent(
				db as never,
				"e1",
				{ to: new Date("2026-11-20T09:00:00Z") } as never,
				"u1",
			),
		).rejects.toBeInstanceOf(EventEndBeforeStartError);
		expect(tx.event.update).not.toHaveBeenCalled();
	});

	it("writes nothing when no field changes", async () => {
		const changed = await updateEvent(
			db as never,
			"e1",
			{ name: "Python alapok" } as never,
			"u1",
		);
		expect(changed).toBe(0);
		expect(tx.event.update).not.toHaveBeenCalled();
		expect(tx.history.createMany).not.toHaveBeenCalled();
	});

	it("fails for an unknown event", async () => {
		tx.event.findUnique.mockResolvedValue(null);
		await expect(
			deleteEvent(db as never, "x", "u1"),
		).rejects.toBeInstanceOf(EventNotFoundError);
		expect(tx.event.delete).not.toHaveBeenCalled();
	});

	it("records the deleted event's name in History", async () => {
		await deleteEvent(db as never, "e1", "u1");
		expect(tx.history.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				fieldName: "deleted",
				oldValue: "Python alapok",
				recordId: "e1",
			}),
		});
	});
});
