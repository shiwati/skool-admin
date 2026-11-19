// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany, count, getSession } = vi.hoisted(() => ({
	findMany: vi.fn(),
	count: vi.fn(),
	getSession: vi.fn(),
}));
vi.mock("next-auth", () => ({ getServerSession: getSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({ db: { applicant: { findMany, count } } }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

import { GET } from "./route";

const call = (qs = "") => GET(new Request(`http://x/api/applicants${qs}`));

describe("GET /api/applicants", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		getSession.mockResolvedValue({ user: {} });
		findMany.mockResolvedValue([]);
		count.mockResolvedValue(0);
	});

	it("rejects unauthenticated requests", async () => {
		getSession.mockResolvedValue(null);
		expect((await call()).status).toBe(401);
	});

	it("validates query params", async () => {
		expect((await call("?pageSize=500")).status).toBe(400);
		expect((await call("?ageFrom=15&ageTo=10")).status).toBe(400);
	});

	it("builds filters, sorting and pagination", async () => {
		count.mockResolvedValue(42);
		const res = await call(
			"?eventIds=e1,e2&hometown=Pécs&newsletter=true&attended=false&q=kiss%20p&page=3&pageSize=10&sort=birthYear&order=desc",
		);
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({
			items: [],
			total: 42,
			page: 3,
			pageSize: 10,
		});

		const args = findMany.mock.calls[0][0];
		expect(args.skip).toBe(20);
		expect(args.take).toBe(10);
		expect(args.orderBy[0]).toEqual({
			birthYear: { sort: "desc", nulls: "last" },
		});
		expect(args.where.AND).toEqual([
			{ applications: { some: { eventId: { in: ["e1", "e2"] } } } },
			{ hometown: { contains: "Pécs", mode: "insensitive" } },
			{ newsletter: true },
			{ NOT: { applications: { some: { status: "ATTENDED" } } } },
			expect.objectContaining({ OR: expect.any(Array) }),
			expect.objectContaining({ OR: expect.any(Array) }),
		]);
		expect(count).toHaveBeenCalledWith({ where: args.where });
	});
});
