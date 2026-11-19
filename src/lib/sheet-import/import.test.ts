// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const tx = vi.hoisted(() => ({
	application: { findUnique: vi.fn(), create: vi.fn() },
	applicant: { count: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
}));
vi.mock("@/lib/db", () => ({
	db: { $transaction: (run: (t: typeof tx) => unknown) => run(tx) },
}));

import { importSheetRows, SheetHeaderError } from "./import";

const HEADERS = ["Időbélyeg", "Vezetéknév", "Utónév", "E-mail cím:"];
const run = (rows: (string | number)[][]) =>
	importSheetRows({
		eventId: "e1",
		rows: [HEADERS, ...rows],
		timeZone: "UTC",
		userId: "u1",
	});

describe("importSheetRows", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		tx.application.findUnique.mockResolvedValue(null);
		tx.applicant.count.mockResolvedValue(0);
		tx.applicant.create.mockResolvedValue({ id: "a1" });
	});

	it("creates a new applicant and application per response", async () => {
		const result = await run([[45000, "Kovács", "Anna", "anna@x.hu"]]);
		expect(result).toMatchObject({
			created: 1,
			existing: 0,
			duplicates: 0,
		});
		expect(tx.applicant.create.mock.calls[0][0].data).toMatchObject({
			lastName: "Kovács",
			duplicateKey: "kovacs|anna|anna@x.hu",
			duplicateFlag: false,
		});
		expect(tx.application.create.mock.calls[0][0].data).toMatchObject({
			eventId: "e1",
			applicantId: "a1",
			sourceKey: "45000|anna@x.hu",
		});
		expect(tx.applicant.updateMany).not.toHaveBeenCalled();
	});

	it("flags the new and the existing applicants as duplicates", async () => {
		tx.applicant.count.mockResolvedValue(1);
		const result = await run([[45000, "Kovács", "Anna", "anna@x.hu"]]);
		expect(result).toMatchObject({ created: 1, duplicates: 1 });
		expect(tx.applicant.updateMany).toHaveBeenCalledWith({
			where: {
				duplicateKey: "kovacs|anna|anna@x.hu",
				duplicateFlag: false,
			},
			data: { duplicateFlag: true },
		});
		expect(tx.applicant.create.mock.calls[0][0].data.duplicateFlag).toBe(
			true,
		);
	});

	it("skips responses imported earlier and reports bad rows", async () => {
		tx.application.findUnique.mockResolvedValue({ id: "x" });
		const result = await run([
			[45000, "Kovács", "Anna", "anna@x.hu"],
			[45001, "Nagy", "Béla", ""],
			["", "", "", ""],
		]);
		expect(result).toMatchObject({
			created: 0,
			existing: 1,
			errors: [{ row: 3, reason: "Hiányzó vagy hibás e-mail cím" }],
		});
		expect(tx.applicant.create).not.toHaveBeenCalled();
	});

	it("rejects sheets without the required columns", async () => {
		await expect(
			importSheetRows({
				eventId: "e1",
				rows: [["Időbélyeg"]],
				timeZone: "UTC",
				userId: "u1",
			}),
		).rejects.toBeInstanceOf(SheetHeaderError);
	});
});
