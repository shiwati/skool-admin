// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany, count, groupBy, getSession } = vi.hoisted(() => ({
	findMany: vi.fn(),
	count: vi.fn(),
	groupBy: vi.fn(),
	getSession: vi.fn(),
}));
vi.mock("next-auth", () => ({ getServerSession: getSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({
	db: { applicant: { findMany, count }, application: { groupBy } },
}));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

import { GET } from "./route";

const call = (qs = "") => GET(new Request(`http://x/api/applicants${qs}`));

describe("GET /api/applicants", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		getSession.mockResolvedValue({ user: {} });
		findMany.mockResolvedValue([]);
		count.mockResolvedValue(0);
		groupBy.mockResolvedValue([
			{ applicantId: "a1", _count: { _all: 1 } },
			{ applicantId: "a2", _count: { _all: 3 } },
			{ applicantId: "a3", _count: { _all: 5 } },
		]);
	});

	it("rejects unauthenticated requests", async () => {
		getSession.mockResolvedValue(null);
		const res = await call();
		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({ error: "Unauthorized" });
		expect(res.headers.get("Cache-Control")).toBe("no-store");
		expect(findMany).not.toHaveBeenCalled();
	});

	it("marks successful responses as not cacheable", async () => {
		const res = await call();
		expect(res.status).toBe(200);
		expect(res.headers.get("Cache-Control")).toBe("no-store");
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
		const res = await call("?pageSize=500");
		expect(res.status).toBe(400);
		expect(res.headers.get("Cache-Control")).toBe("no-store");
		const body = await res.json();
		expect(body.error).toBe("Invalid query parameters");
		expect(body.details.fieldErrors).toHaveProperty("pageSize");
		expect((await call("?ageFrom=15&ageTo=10")).status).toBe(400);
		expect((await call("?historyFrom=3&historyTo=1")).status).toBe(400);
	});

	it("filters by a history range starting above zero", async () => {
		await call("?historyFrom=2&historyTo=4");
		expect(findMany.mock.calls[0][0].where.AND).toContainEqual({
			id: { in: ["a2"] },
		});
	});

	it("sorts by history count in memory and loads only the page", async () => {
		findMany
			.mockResolvedValueOnce([
				{ id: "a1", lastName: "B", firstName: "X" },
				{ id: "a3", lastName: "C", firstName: "X" },
				{ id: "a0", lastName: "A", firstName: "X" },
			])
			.mockResolvedValueOnce([{ id: "a3" }, { id: "a1" }]);
		const res = await call("?sort=history&order=desc&pageSize=10");
		expect(findMany.mock.calls[1][0].where).toEqual({
			id: { in: ["a3", "a1", "a0"] },
		});
		expect(await res.json()).toMatchObject({
			items: [{ id: "a3" }, { id: "a1" }],
			total: 3,
		});
	});

	it("builds filters, sorting and pagination", async () => {
		count.mockResolvedValue(42);
		const res = await call(
			"?eventIds=e1,e2&programYear=2025&hometown=Pécs&newsletter=true&historyFrom=0&historyTo=3&q=kiss%20p&page=3&pageSize=10&sort=birthYear&order=desc",
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
			{ id: { notIn: ["a3"] } },
			expect.objectContaining({ OR: expect.any(Array) }),
			expect.objectContaining({ OR: expect.any(Array) }),
		]);
		expect(count).toHaveBeenCalledWith({ where: args.where });
	});
});
