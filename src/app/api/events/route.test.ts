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
	db: { event: { findMany, count }, application: { groupBy } },
}));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

import { GET } from "./route";

const call = (qs = "") => GET(new Request(`http://x/api/events${qs}`));

describe("GET /api/events", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		getSession.mockResolvedValue({ user: {} });
	});

	it("filters by year and defaults to newest first", async () => {
		findMany.mockResolvedValue([]);
		count.mockResolvedValue(0);
		await call("?year=2026&companyName=acme&instructor=béla&q=python");
		const args = findMany.mock.calls[0][0];
		expect(args.orderBy[0]).toEqual({ from: "desc" });
		expect(args.where.AND).toEqual([
			{
				from: {
					gte: new Date("2025-12-31T23:00:00Z"),
					lt: new Date("2026-12-31T23:00:00Z"),
				},
			},
			{ companyName: { contains: "acme", mode: "insensitive" } },
			{ instructor: { contains: "béla", mode: "insensitive" } },
			{ name: { contains: "python", mode: "insensitive" } },
		]);
		expect(groupBy).not.toHaveBeenCalled();
	});

	it("attaches application counts per status", async () => {
		findMany.mockResolvedValue([{ id: "e1" }, { id: "e2" }]);
		count.mockResolvedValue(2);
		groupBy.mockResolvedValue([
			{ eventId: "e1", status: "APPLIED", _count: { _all: 3 } },
			{ eventId: "e1", status: "ACCEPTED", _count: { _all: 2 } },
		]);
		const body = await (await call()).json();
		expect(body.items[0].applicationCounts).toMatchObject({
			APPLIED: 3,
			ACCEPTED: 2,
			REJECTED: 0,
			total: 5,
		});
		expect(body.items[1].applicationCounts.total).toBe(0);
	});
});
