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

	it("always excludes anonymized (deleted) applicants", async () => {
		await call();
		const { where } = findMany.mock.calls[0][0];
		expect(where.AND).toEqual([{ deletedAt: null }]);
		expect(count).toHaveBeenCalledWith({ where });
	});

	it.each([
		["lastName", { lastName: "asc" }],
		["createdAt", { createdAt: "asc" }],
		["hometown", { hometown: { sort: "asc", nulls: "last" } }],
	])(
		"sorts by %s with nulls last only when nullable",
		async (sort, first) => {
			await call(`?sort=${sort}&order=asc`);
			expect(findMany.mock.calls[0][0].orderBy[0]).toEqual(first);
		},
	);

	it("validates query params", async () => {
		expect((await call("?pageSize=500")).status).toBe(400);
		expect((await call("?ageFrom=15&ageTo=10")).status).toBe(400);
	});

	it("builds filters, sorting and pagination", async () => {
		count.mockResolvedValue(42);
		const res = await call(
			"?eventIds=e1,e2&programYear=2025&hometown=Pécs&newsletter=true&attended=false&q=kiss%20p&page=3&pageSize=10&sort=birthYear&order=desc",
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
			{ deletedAt: null },
			{ applications: { some: { eventId: { in: ["e1", "e2"] } } } },
			{
				applications: {
					some: {
						event: {
							from: {
								gte: new Date("2024-12-31T23:00:00.000Z"),
								lt: new Date("2025-12-31T23:00:00.000Z"),
							},
						},
					},
				},
			},
			{ hometown: { contains: "Pécs", mode: "insensitive" } },
			{ newsletter: true },
			{ NOT: { applications: { some: { status: "ATTENDED" } } } },
			expect.objectContaining({ OR: expect.any(Array) }),
			expect.objectContaining({ OR: expect.any(Array) }),
		]);
		expect(count).toHaveBeenCalledWith({ where: args.where });
	});
});
