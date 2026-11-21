// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createMany } = vi.hoisted(() => ({ createMany: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { feedback: { createMany } } }));

import { FeedbackHeaderError, importFeedbackRows } from "./import";

const HEADERS = [
	"Időbélyeg",
	"Milyennek ítéled meg egészében a műhelyfoglalkozást?",
	"Mi volt a nap fénypontja?",
];

const ROWS = [
	HEADERS,
	[46336.6, 5, "Jól szervezett nap."],
	[null, "", ""],
	[46336.7, "-", "-"],
	[46336.8, 4, "Minden."],
];

const run = (rows = ROWS) =>
	importFeedbackRows({
		eventId: "e1",
		role: "MENTOR",
		rows,
		timeZone: "UTC",
	});

describe("importFeedbackRows", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("inserts parsed rows once with skipDuplicates", async () => {
		createMany.mockResolvedValue({ count: 2 });
		const result = await run();
		expect(createMany).toHaveBeenCalledTimes(1);
		const [{ data, skipDuplicates }] = createMany.mock.calls[0];
		expect(skipDuplicates).toBe(true);
		expect(data).toHaveLength(2);
		expect(data[0]).toMatchObject({
			eventId: "e1",
			role: "MENTOR",
			sourceKey: "46336.6#0",
			overallScore: 5,
		});
		expect(result).toMatchObject({ created: 2, existing: 0 });
	});

	it("counts already imported rows as existing on resync", async () => {
		createMany.mockResolvedValue({ count: 0 });
		expect(await run()).toMatchObject({ created: 0, existing: 2 });
	});

	it("skips empty rows silently and reports unreadable ones by sheet row", async () => {
		createMany.mockResolvedValue({ count: 2 });
		const result = await run();
		// Header is row 1, so the dash-only row (4th line) is sheet row 4.
		expect(result.errors).toEqual([
			{ row: 4, reason: "Nincs értelmezhető válasz" },
		]);
		expect(result.unmappedHeaders).toEqual([]);
	});

	it("does not touch the database without importable rows", async () => {
		const result = await run([HEADERS, [null, "", ""]]);
		expect(createMany).not.toHaveBeenCalled();
		expect(result).toEqual({
			created: 0,
			existing: 0,
			errors: [],
			unmappedHeaders: [],
		});
	});

	it("throws a FeedbackHeaderError when required columns are missing", async () => {
		await expect(run([["Mi volt a nap fénypontja?"]])).rejects.toEqual(
			expect.objectContaining({
				role: "MENTOR",
				missing: ["Időbélyeg", "A műhelyfoglalkozás összességében"],
			}),
		);
		await expect(run([["x"]])).rejects.toBeInstanceOf(FeedbackHeaderError);
		expect(createMany).not.toHaveBeenCalled();
	});
});
