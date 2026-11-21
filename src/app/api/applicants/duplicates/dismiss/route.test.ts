// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession, db } = vi.hoisted(() => ({
	getSession: vi.fn(),
	db: {
		applicant: { findMany: vi.fn() },
		duplicateDismissal: { createMany: vi.fn() },
		history: { create: vi.fn() },
		$transaction: vi.fn(),
	},
}));
vi.mock("@/lib/session", () => ({ getAdminSession: getSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/logger", () => ({
	logger: { info: vi.fn(), error: vi.fn() },
}));

import { POST } from "./route";

const call = (body: unknown) =>
	POST(
		new Request("http://x/api/applicants/duplicates/dismiss", {
			method: "POST",
			body: JSON.stringify(body),
		}),
	);

describe("POST /api/applicants/duplicates/dismiss", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		getSession.mockResolvedValue({ user: { id: "u1" } });
		db.applicant.findMany.mockResolvedValue([
			{ duplicateKey: "k" },
			{ duplicateKey: "k" },
		]);
		db.$transaction.mockResolvedValue([]);
	});

	it("rejects signed-out requests", async () => {
		getSession.mockResolvedValue(null);
		const res = await call({ applicantIds: ["a", "b"] });
		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({ error: "Unauthorized" });
	});

	it("rejects a pair of the same id", async () => {
		expect((await call({ applicantIds: ["a", "a"] })).status).toBe(400);
	});

	it("returns 404 for unknown or deleted applicants", async () => {
		db.applicant.findMany.mockResolvedValue([{ duplicateKey: "k" }]);
		expect((await call({ applicantIds: ["a", "b"] })).status).toBe(404);
	});

	it("returns 409 when the keys differ", async () => {
		db.applicant.findMany.mockResolvedValue([
			{ duplicateKey: "k" },
			{ duplicateKey: "j" },
		]);
		expect((await call({ applicantIds: ["a", "b"] })).status).toBe(409);
	});

	it("stores the pair ordered by id and logs it to history", async () => {
		const res = await call({ applicantIds: ["z", "a"] });
		expect(res.status).toBe(200);
		expect(db.duplicateDismissal.createMany).toHaveBeenCalledWith({
			data: [{ applicantAId: "a", applicantBId: "z", createdById: "u1" }],
			skipDuplicates: true,
		});
		expect(db.history.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				fieldName: "duplicate_dismissed",
				recordId: "a",
				newValue: "z",
				createdById: "u1",
			}),
		});
	});
});
