// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	DuplicateApplicantNotFoundError,
	mergeApplicants,
	NotDuplicatesError,
} from "./merge";

const tx = {
	applicant: {
		findMany: vi.fn(),
		deleteMany: vi.fn(),
		update: vi.fn(),
		count: vi.fn(),
		updateMany: vi.fn(),
		findUniqueOrThrow: vi.fn(),
	},
	application: { updateMany: vi.fn() },
	history: { createMany: vi.fn(), updateMany: vi.fn() },
};
const db = { $transaction: (run: (t: typeof tx) => unknown) => run(tx) };
const merge = (mergeIds = ["m1", "m2"]) =>
	mergeApplicants(db as never, "p", mergeIds, "u1");

describe("mergeApplicants", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		tx.applicant.findMany.mockResolvedValue([
			{ id: "p", duplicateKey: "k" },
			{ id: "m1", duplicateKey: "k" },
			{ id: "m2", duplicateKey: "k" },
		]);
		tx.application.updateMany.mockResolvedValue({ count: 3 });
		tx.applicant.count.mockResolvedValue(1);
		tx.applicant.findUniqueOrThrow.mockResolvedValue({ id: "p" });
	});

	it("loads only non-deleted applicants and fails if one is missing", async () => {
		tx.applicant.findMany.mockResolvedValue([
			{ id: "p", duplicateKey: "k" },
			{ id: "m1", duplicateKey: "k" },
		]);
		await expect(merge()).rejects.toBeInstanceOf(
			DuplicateApplicantNotFoundError,
		);
		expect(tx.applicant.findMany.mock.calls[0][0].where).toEqual({
			id: { in: ["p", "m1", "m2"] },
			deletedAt: null,
		});
		expect(tx.applicant.deleteMany).not.toHaveBeenCalled();
	});

	it("refuses applicants with different or missing keys", async () => {
		tx.applicant.findMany.mockResolvedValue([
			{ id: "p", duplicateKey: "k" },
			{ id: "m1", duplicateKey: "other" },
			{ id: "m2", duplicateKey: "k" },
		]);
		await expect(merge()).rejects.toBeInstanceOf(NotDuplicatesError);
		tx.applicant.findMany.mockResolvedValue([
			{ id: "p", duplicateKey: null },
			{ id: "m1", duplicateKey: null },
			{ id: "m2", duplicateKey: null },
		]);
		await expect(merge()).rejects.toBeInstanceOf(NotDuplicatesError);
		expect(tx.application.updateMany).not.toHaveBeenCalled();
	});

	it("moves data to the kept applicant before deleting the merged ones", async () => {
		const result = await merge();
		expect(result).toEqual({
			applicant: { id: "p" },
			movedApplications: 3,
		});
		const order = (fn: { mock: { invocationCallOrder: number[] } }) =>
			fn.mock.invocationCallOrder[0];
		expect(order(tx.application.updateMany)).toBeLessThan(
			order(tx.applicant.deleteMany),
		);
		expect(order(tx.history.updateMany)).toBeLessThan(
			order(tx.applicant.deleteMany),
		);
		expect(tx.history.createMany.mock.calls[0][0].data).toHaveLength(2);
		expect(tx.applicant.deleteMany).toHaveBeenCalledWith({
			where: { id: { in: ["m1", "m2"] } },
		});
		// Flags are recomputed once the merged applicants are gone.
		expect(order(tx.applicant.count)).toBeGreaterThan(
			order(tx.applicant.deleteMany),
		);
	});
});
