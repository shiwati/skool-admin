// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { applicantFindFirst, eventFindUnique, historyFindMany } = vi.hoisted(
	() => ({
		applicantFindFirst: vi.fn(),
		eventFindUnique: vi.fn(),
		historyFindMany: vi.fn(),
	}),
);
vi.mock("@/lib/db", () => ({
	db: {
		applicant: { findFirst: applicantFindFirst },
		event: { findUnique: eventFindUnique },
		history: { findMany: historyFindMany },
	},
}));

import {
	getHistoryEntries,
	getHistorySubject,
	type HistorySubject,
} from "./queries";

describe("getHistorySubject", () => {
	beforeEach(() => vi.resetAllMocks());

	it("resolves a non-deleted applicant with its applications", async () => {
		applicantFindFirst.mockResolvedValue({
			id: "a1",
			firstName: "Luca",
			lastName: "Nagy",
			applications: [{ id: "app1", event: { name: "Python alapok" } }],
		});
		expect(await getHistorySubject("a1")).toEqual({
			kind: "applicant",
			id: "a1",
			name: "Nagy Luca",
			applications: [{ id: "app1", programName: "Python alapok" }],
		});
		expect(applicantFindFirst.mock.calls[0][0].where).toEqual({
			id: "a1",
			deletedAt: null,
		});
		expect(eventFindUnique).not.toHaveBeenCalled();
	});

	it("falls back to a program", async () => {
		applicantFindFirst.mockResolvedValue(null);
		eventFindUnique.mockResolvedValue({ id: "e1", name: "Robotika" });
		expect(await getHistorySubject("e1")).toEqual({
			kind: "event",
			id: "e1",
			name: "Robotika",
		});
	});

	it("returns null when neither exists", async () => {
		applicantFindFirst.mockResolvedValue(null);
		eventFindUnique.mockResolvedValue(null);
		expect(await getHistorySubject("nope")).toBeNull();
	});
});

describe("getHistoryEntries", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		historyFindMany.mockResolvedValue([]);
	});

	it("reads a program's own changes, newest first, up to the limit", async () => {
		await getHistoryEntries({ kind: "event", id: "e1", name: "R" }, 200);
		const args = historyFindMany.mock.calls[0][0];
		expect(args.where).toEqual({ tableName: "event", recordId: "e1" });
		expect(args.take).toBe(200);
		expect(args.orderBy[0]).toEqual({ createdAt: "desc" });
	});

	it("reads an applicant's and its applications' changes with program names", async () => {
		const subject: HistorySubject = {
			kind: "applicant",
			id: "a1",
			name: "Nagy Luca",
			applications: [{ id: "app1", programName: "Python alapok" }],
		};
		const at = new Date("2026-11-19T10:12:00Z");
		historyFindMany.mockResolvedValue([
			{
				id: "h1",
				tableName: "application",
				fieldName: "status",
				recordId: "app1",
				oldValue: "APPLIED",
				newValue: "ACCEPTED",
				createdAt: at,
				createdBy: { name: "Kovács Anna" },
			},
		]);
		const entries = await getHistoryEntries(subject, 5);
		expect(historyFindMany.mock.calls[0][0].where).toEqual({
			OR: [
				{ tableName: "applicant", recordId: "a1" },
				{ tableName: "application", recordId: { in: ["app1"] } },
			],
		});
		expect(entries).toEqual([
			{
				id: "h1",
				actor: "Kovács Anna",
				field: "status",
				programName: "Python alapok",
				oldValue: "APPLIED",
				newValue: "ACCEPTED",
				createdAt: at,
			},
		]);
	});
});
