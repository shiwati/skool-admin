// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany, count, groupBy, create, getSession, getAdminSession } =
	vi.hoisted(() => ({
		create: vi.fn(),
		getAdminSession: vi.fn(),
		findMany: vi.fn(),
		count: vi.fn(),
		groupBy: vi.fn(),
		getSession: vi.fn(),
	}));
vi.mock("next-auth", () => ({ getServerSession: getSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({
	db: { event: { findMany, count, create }, application: { groupBy } },
}));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), info: vi.fn() } }));
vi.mock("@/lib/session", () => ({ getAdminSession }));

import { GET, POST } from "./route";

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

	it("filters by tags (any match), repeated params only, deduplicated", async () => {
		findMany.mockResolvedValue([]);
		count.mockResolvedValue(0);
		await call("?tags=robotika&tags=kezd%C5%91&tags=robotika&tags=%20");
		expect(findMany.mock.calls[0][0].where.AND).toEqual([
			{ tags: { hasSome: ["robotika", "kezdő"] } },
		]);
	});

	it("rejects a tag that is not in the fixed list", async () => {
		const res = await call("?tags=robotika&tags=nemletezik");
		expect(res.status).toBe(400);
		expect((await res.json()).error).toBe("Invalid query parameters");
		expect(findMany).not.toHaveBeenCalled();
	});

	it("does not split tags on commas", async () => {
		const res = await call("?tags=robotika,kezd%C5%91");
		expect(res.status).toBe(400);
		expect(findMany).not.toHaveBeenCalled();
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

describe("POST /api/events", () => {
	const post = (body: unknown) =>
		POST(
			new Request("http://x/api/events", {
				method: "POST",
				body: typeof body === "string" ? body : JSON.stringify(body),
			}),
		);

	beforeEach(() => {
		vi.resetAllMocks();
		getAdminSession.mockResolvedValue({ user: { id: "u1" } });
	});

	it("rejects unauthenticated requests", async () => {
		getAdminSession.mockResolvedValue(null);
		const res = await post({});
		expect(res.status).toBe(401);
		expect(create).not.toHaveBeenCalled();
	});

	it("rejects invalid bodies", async () => {
		expect((await post("{")).status).toBe(400);
		const res = await post({
			name: "",
			from: "2026-05-02",
			to: "2026-05-01",
		});
		expect(res.status).toBe(400);
		const json = await res.json();
		expect(json.details.fieldErrors).toHaveProperty("name");
		expect(create).not.toHaveBeenCalled();
	});

	it("creates the event and returns its id", async () => {
		create.mockResolvedValue({ id: "e1" });
		const res = await post({
			name: " Tábor ",
			from: "2026-07-01T08:00:00Z",
			to: "2026-07-05T16:00:00Z",
			companyName: "",
			capacity: 20,
		});
		expect(res.status).toBe(201);
		expect(await res.json()).toEqual({ id: "e1" });
		expect(create).toHaveBeenCalledWith({
			data: {
				name: "Tábor",
				from: new Date("2026-07-01T08:00:00Z"),
				to: new Date("2026-07-05T16:00:00Z"),
				companyName: null,
				tags: [],
				mentors: [],
				capacity: 20,
			},
			select: { id: true },
		});
	});
});
