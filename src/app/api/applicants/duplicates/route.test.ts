// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession, db } = vi.hoisted(() => ({
	getSession: vi.fn(),
	db: {
		applicant: { findMany: vi.fn() },
		duplicateDismissal: { findMany: vi.fn() },
	},
}));
vi.mock("next-auth", () => ({ getServerSession: getSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

import { GET } from "./route";

const call = (query = "") =>
	GET(new Request(`http://x/api/applicants/duplicates${query}`));
const cand = (id: string, day: number) => ({
	id,
	duplicateKey: "k",
	createdAt: new Date(Date.UTC(2026, 0, day)),
});

describe("GET /api/applicants/duplicates", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		getSession.mockResolvedValue({ user: { id: "u1" } });
		db.applicant.findMany.mockImplementation(
			({ where }: { where: { id?: { in: string[] } } }) =>
				where.id
					? where.id.in.map((id) => ({ id, applications: [] }))
					: [cand("a", 1), cand("b", 2), cand("c", 3)],
		);
		db.duplicateDismissal.findMany.mockResolvedValue([
			{ applicantAId: "a", applicantBId: "b" },
		]);
	});

	it("rejects signed-out requests", async () => {
		getSession.mockResolvedValue(null);
		const res = await call();
		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({ error: "Unauthorized" });
	});

	it("returns the first undismissed pair and the count", async () => {
		const body = await (await call()).json();
		expect(body.total).toBe(2);
		expect(body.index).toBe(0);
		expect(body.pair.a.id).toBe("a");
		expect(body.pair.b.id).toBe("c");
	});

	it("wraps around when skipping past the end", async () => {
		const body = await (await call("?skip=3")).json();
		expect(body.index).toBe(1);
		expect(body.pair).toMatchObject({ a: { id: "b" }, b: { id: "c" } });
	});

	it("returns no pair when there are no candidates", async () => {
		db.applicant.findMany.mockResolvedValue([]);
		expect(await (await call()).json()).toEqual({
			total: 0,
			index: 0,
			pair: null,
		});
	});
});
