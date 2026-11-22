// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirst, historyFindMany } = vi.hoisted(() => ({
	findFirst: vi.fn(),
	historyFindMany: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
	db: {
		applicant: { findFirst },
		history: { findMany: historyFindMany },
	},
}));

import { HISTORY_PREVIEW_LIMIT } from "@/lib/history/queries";
import { getApplicantDetail, getApplicantForEdit } from "./detail";

const applicant = {
	id: "a1",
	firstName: "Luca",
	lastName: "Nagy",
	applications: [
		{ id: "app1", event: { id: "e1", name: "Python alapok – ősz" } },
		{ id: "app2", event: { id: "e2", name: "Robotika tábor" } },
	],
};

describe("getApplicantDetail", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		historyFindMany.mockResolvedValue([]);
	});

	it("returns null for unknown or deleted applicants without reading history", async () => {
		findFirst.mockResolvedValue(null);
		expect(await getApplicantDetail("missing")).toBeNull();
		expect(findFirst.mock.calls[0][0].where).toEqual({
			id: "missing",
			deletedAt: null,
		});
		expect(historyFindMany).not.toHaveBeenCalled();
	});

	it("does not select internal duplicate fields", async () => {
		findFirst.mockResolvedValue(null);
		await getApplicantDetail("x");
		const select = findFirst.mock.calls[0][0].select;
		expect(select).not.toHaveProperty("duplicateKey");
		expect(select).not.toHaveProperty("deletedById");
	});

	it("reads the latest history of the applicant and its applications", async () => {
		findFirst.mockResolvedValue(applicant);
		await getApplicantDetail("a1");
		const args = historyFindMany.mock.calls[0][0];
		expect(args.where.OR).toEqual([
			{ tableName: "applicant", recordId: { in: ["a1"] } },
			{ tableName: "application", recordId: { in: ["app1", "app2"] } },
		]);
		expect(args.take).toBe(HISTORY_PREVIEW_LIMIT);
		expect(HISTORY_PREVIEW_LIMIT).toBe(5);
		expect(args.orderBy[0]).toEqual({ createdAt: "desc" });
	});

	it("only queries applicant history when there are no applications", async () => {
		findFirst.mockResolvedValue({ ...applicant, applications: [] });
		await getApplicantDetail("a1");
		expect(historyFindMany.mock.calls[0][0].where.OR).toEqual([
			{ tableName: "applicant", recordId: { in: ["a1"] } },
		]);
	});

	it("maps actors and program names onto history entries", async () => {
		findFirst.mockResolvedValue(applicant);
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
			{
				id: "h2",
				tableName: "applicant",
				fieldName: "phoneNumber",
				recordId: "a1",
				oldValue: null,
				newValue: null,
				createdAt: at,
				createdBy: null,
			},
		]);
		const detail = await getApplicantDetail("a1");
		expect(detail?.history).toEqual([
			{
				id: "h1",
				actor: "Kovács Anna",
				field: "status",
				programName: "Python alapok – ősz",
				oldValue: "APPLIED",
				newValue: "ACCEPTED",
				createdAt: at,
			},
			{
				id: "h2",
				actor: null,
				field: "phoneNumber",
				programName: null,
				oldValue: null,
				newValue: null,
				createdAt: at,
			},
		]);
	});
});

describe("getApplicantForEdit", () => {
	beforeEach(() => vi.resetAllMocks());

	it("reads only non-deleted applicants and only the editable fields", async () => {
		findFirst.mockResolvedValue(null);
		expect(await getApplicantForEdit("a1")).toBeNull();
		const args = findFirst.mock.calls[0][0];
		expect(args.where).toEqual({ id: "a1", deletedAt: null });
		expect(args.select).toMatchObject({ updatedAt: true, email: true });
		expect(args.select).not.toHaveProperty("duplicateKey");
		expect(args.select).not.toHaveProperty("applications");
	});
});
