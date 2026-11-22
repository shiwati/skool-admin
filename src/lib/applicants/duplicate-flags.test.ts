import { beforeEach, describe, expect, it, vi } from "vitest";
import { duplicateKey, recomputeDuplicateFlags } from "./duplicate-flags";

describe("duplicateKey", () => {
	it("ignores case, accents and extra spaces", () => {
		expect(duplicateKey(" Kovács", "Anna  Mária", "Anna@Example.com")).toBe(
			duplicateKey("kovacs", "anna maria", "anna@example.com"),
		);
		expect(duplicateKey("Kovács", "Anna", "a@x.hu")).not.toBe(
			duplicateKey("Kovács", "Anna", "b@x.hu"),
		);
	});
});

describe("recomputeDuplicateFlags", () => {
	const tx = { applicant: { count: vi.fn(), updateMany: vi.fn() } };

	beforeEach(() => vi.resetAllMocks());

	it("flags a key shared by two non-deleted applicants", async () => {
		tx.applicant.count.mockResolvedValue(2);
		await recomputeDuplicateFlags(tx as never, ["k"]);
		expect(tx.applicant.count).toHaveBeenCalledWith({
			where: { duplicateKey: "k", deletedAt: null },
		});
		expect(tx.applicant.updateMany).toHaveBeenCalledWith({
			where: { duplicateKey: "k", deletedAt: null, duplicateFlag: false },
			data: { duplicateFlag: true },
		});
	});

	it("clears the flag of the last applicant with the key", async () => {
		tx.applicant.count.mockResolvedValue(1);
		await recomputeDuplicateFlags(tx as never, ["k"]);
		expect(tx.applicant.updateMany).toHaveBeenCalledWith({
			where: { duplicateKey: "k", deletedAt: null, duplicateFlag: true },
			data: { duplicateFlag: false },
		});
	});

	it("handles each key once and skips empty ones", async () => {
		tx.applicant.count.mockResolvedValue(1);
		await recomputeDuplicateFlags(tx as never, [
			"a",
			null,
			"a",
			undefined,
			"b",
		]);
		expect(tx.applicant.count).toHaveBeenCalledTimes(2);
	});
});
