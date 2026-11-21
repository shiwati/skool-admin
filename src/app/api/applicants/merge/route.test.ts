// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession, tx } = vi.hoisted(() => ({
	getSession: vi.fn(),
	tx: {
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
	},
}));
vi.mock("@/lib/session", () => ({ getAdminSession: getSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({
	db: { $transaction: (run: (t: typeof tx) => unknown) => run(tx) },
}));
vi.mock("@/lib/logger", () => ({
	logger: { info: vi.fn(), error: vi.fn() },
}));

import { POST } from "./route";

const call = (body: unknown) =>
	POST(
		new Request("http://x/api/applicants/merge", {
			method: "POST",
			body: JSON.stringify(body),
		}),
	);

describe("POST /api/applicants/merge", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		getSession.mockResolvedValue({ user: { id: "u1" } });
		tx.applicant.findMany.mockResolvedValue([
			{ id: "p", duplicateKey: "k" },
			{ id: "m", duplicateKey: "k" },
		]);
		tx.application.updateMany.mockResolvedValue({ count: 2 });
		tx.applicant.count.mockResolvedValue(1);
		tx.applicant.findUniqueOrThrow.mockResolvedValue({
			id: "p",
			applications: [],
		});
	});

	it("rejects signed-out requests", async () => {
		getSession.mockResolvedValue(null);
		const res = await call({ primaryId: "p", mergeIds: ["m"] });
		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({ error: "Unauthorized" });
	});

	it.each([
		[{ primaryId: "p", mergeIds: [] }],
		[{ primaryId: "p", mergeIds: ["p"] }],
		[{ primaryId: "p", mergeIds: ["m", "m"] }],
	])("validates the body %j", async (body) => {
		expect((await call(body)).status).toBe(400);
	});

	it("returns 404 when an applicant is missing", async () => {
		tx.applicant.findMany.mockResolvedValue([
			{ id: "p", duplicateKey: "k" },
		]);
		expect((await call({ primaryId: "p", mergeIds: ["m"] })).status).toBe(
			404,
		);
		expect(tx.applicant.deleteMany).not.toHaveBeenCalled();
	});

	it("only loads non-deleted applicants, so an anonymized one is 404", async () => {
		tx.applicant.findMany.mockResolvedValue([
			{ id: "p", duplicateKey: "k" },
		]);
		const res = await call({ primaryId: "p", mergeIds: ["anon"] });
		expect(res.status).toBe(404);
		expect(tx.applicant.findMany.mock.calls[0][0].where).toEqual({
			id: { in: ["p", "anon"] },
			deletedAt: null,
		});
	});

	it.each([
		["keys differ", "k", "other"],
		["a key is missing", "k", null],
		["both keys are missing", null, null],
	])("returns 409 and changes nothing when %s", async (_, a, b) => {
		tx.applicant.findMany.mockResolvedValue([
			{ id: "p", duplicateKey: a },
			{ id: "m", duplicateKey: b },
		]);
		const res = await call({ primaryId: "p", mergeIds: ["m"] });
		expect(res.status).toBe(409);
		expect(tx.application.updateMany).not.toHaveBeenCalled();
		expect(tx.history.updateMany).not.toHaveBeenCalled();
		expect(tx.history.createMany).not.toHaveBeenCalled();
		expect(tx.applicant.deleteMany).not.toHaveBeenCalled();
	});

	it("moves the merged applicants' history to the kept applicant", async () => {
		await call({ primaryId: "p", mergeIds: ["m"] });
		expect(tx.history.updateMany).toHaveBeenCalledWith({
			where: { tableName: "applicant", recordId: { in: ["m"] } },
			data: { recordId: "p" },
		});
		const order = (fn: { mock: { invocationCallOrder: number[] } }) =>
			fn.mock.invocationCallOrder[0];
		expect(order(tx.history.updateMany)).toBeLessThan(
			order(tx.history.createMany),
		);
		expect(order(tx.history.updateMany)).toBeLessThan(
			order(tx.applicant.deleteMany),
		);
	});

	it("moves applications, logs history, deletes merged and clears the flag", async () => {
		const res = await call({ primaryId: "p", mergeIds: ["m"] });
		expect(res.status).toBe(200);
		expect((await res.json()).movedApplications).toBe(2);
		expect(tx.application.updateMany).toHaveBeenCalledWith({
			where: { applicantId: { in: ["m"] } },
			data: { applicantId: "p", updatedById: "u1" },
		});
		expect(tx.history.createMany.mock.calls[0][0].data).toEqual([
			{
				tableName: "applicant",
				fieldName: "merged_from",
				oldValue: "m",
				newValue: "p",
				recordId: "p",
				createdById: "u1",
			},
		]);
		expect(tx.applicant.deleteMany).toHaveBeenCalledWith({
			where: { id: { in: ["m"] } },
		});
		expect(tx.applicant.updateMany).toHaveBeenCalledWith({
			where: { duplicateKey: "k", deletedAt: null },
			data: { duplicateFlag: false },
		});
	});

	it("keeps the flag while another duplicate remains", async () => {
		tx.applicant.count.mockResolvedValue(2);
		await call({ primaryId: "p", mergeIds: ["m"] });
		expect(tx.applicant.updateMany).toHaveBeenCalledWith({
			where: { duplicateKey: "k", deletedAt: null },
			data: { duplicateFlag: true },
		});
	});
});
