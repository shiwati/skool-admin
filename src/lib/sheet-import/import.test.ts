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

	it("does not bring back an applicant merged into another one", async () => {
		// After a merge the response's application (same sourceKey) belongs
		// to the kept applicant; the lookup is by event + sourceKey only.
		tx.application.findUnique.mockResolvedValue({ id: "moved-app" });
		const result = await run([[45000, "Kovács", "Anna", "anna@x.hu"]]);
		expect(result).toMatchObject({ created: 0, existing: 1 });
		expect(tx.application.findUnique).toHaveBeenCalledWith({
			where: {
				eventId_sourceKey: {
					eventId: "e1",
					sourceKey: "45000|anna@x.hu",
				},
			},
			select: { id: true },
		});
		expect(tx.applicant.create).not.toHaveBeenCalled();
		expect(tx.applicant.updateMany).not.toHaveBeenCalled();
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

describe("importSheetRows (applicant-sheet-import spec)", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		tx.application.findUnique.mockResolvedValue(null);
		tx.applicant.count.mockResolvedValue(0);
		tx.applicant.create.mockResolvedValue({ id: "a1" });
	});

	it("counts only applicants with the same non-null duplicate key", async () => {
		// Anonymized (deleted) applicants have a null key, so they never match.
		tx.applicant.count.mockResolvedValue(1);
		const result = await run([[45000, "Kovács", "Anna", "ANNA@x.hu"]]);
		expect(result).toMatchObject({ created: 1, duplicates: 1 });
		expect(tx.applicant.count).toHaveBeenCalledWith({
			where: { duplicateKey: "kovacs|anna|anna@x.hu" },
		});
	});

	it("imports nothing when a required column is missing", async () => {
		const error = await importSheetRows({
			eventId: "e1",
			rows: [
				["Vezetéknév", "Utónév"],
				["Kovács", "Anna"],
			],
			timeZone: "UTC",
			userId: "u1",
		}).catch((e: unknown) => e);
		expect(error).toBeInstanceOf(SheetHeaderError);
		expect((error as SheetHeaderError).missing).toEqual(["email"]);
		expect(tx.application.create).not.toHaveBeenCalled();
	});

	it("reports an invalid row by sheet row number and imports the others", async () => {
		const result = await run([
			[45000, "Kovács", "Anna", "anna@x.hu"],
			[45001, "Nagy", "", "b@x.hu"],
			["", "", "", ""],
			[45003, "Kiss", "Béla", "nincs"],
			[45004, "Tóth", "Cili", "cili@x.hu"],
		]);
		expect(result.errors).toEqual([
			{ row: 3, reason: "Hiányzó név" },
			{ row: 5, reason: "Hiányzó vagy hibás e-mail cím" },
		]);
		expect(result.created).toBe(2);
	});

	it("records the admin as editor and reports unmapped headers", async () => {
		const result = await importSheetRows({
			eventId: "e1",
			rows: [
				[...HEADERS, "Póló méret"],
				[45000, "Kovács", "Anna", "Anna@X.hu", "M"],
			],
			timeZone: "UTC",
			userId: "u1",
		});
		expect(result).toEqual({
			created: 1,
			existing: 0,
			duplicates: 0,
			errors: [],
			unmappedHeaders: ["Póló méret"],
		});
		expect(tx.applicant.create.mock.calls[0][0].data).toMatchObject({
			email: "anna@x.hu",
			updatedById: "u1",
		});
		expect(tx.application.create.mock.calls[0][0].data).toMatchObject({
			updatedById: "u1",
			receivedAt: new Date(Date.UTC(1899, 11, 30) + 45000 * 86_400_000),
		});
	});
});
