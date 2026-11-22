// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany, count, groupBy, create, getAdminSession, queryRaw } =
	vi.hoisted(() => ({
		create: vi.fn(),
		getAdminSession: vi.fn(),
		findMany: vi.fn(),
		count: vi.fn(),
		groupBy: vi.fn(),
		queryRaw: vi.fn(),
	}));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({
	db: {
		event: { findMany, count, create },
		application: { groupBy },
		$queryRaw: queryRaw,
	},
}));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), info: vi.fn() } }));
vi.mock("@/lib/session", () => ({ getAdminSession }));

import { GET, POST } from "./route";

const call = (qs = "") => GET(new Request(`http://x/api/events${qs}`));

describe("GET /api/events", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		getAdminSession.mockResolvedValue({ user: {} });
		// Stands in for lower(unaccent(…)) in the database.
		queryRaw.mockImplementation(async (_sql: unknown, texts: string[]) =>
			texts.map((text) => ({
				folded: text
					.normalize("NFD")
					.replace(/\p{Diacritic}/gu, "")
					.toLowerCase(),
			})),
		);
	});

	it("rejects unauthenticated requests", async () => {
		getAdminSession.mockResolvedValue(null);
		const res = await call();
		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({ error: "Unauthorized" });
		expect(findMany).not.toHaveBeenCalled();
	});

	it("folds every text filter in one query, in a fixed order", async () => {
		findMany.mockResolvedValue([]);
		count.mockResolvedValue(0);
		await call(
			"?q=Győr%20tábor&instructor=Péter&place=Pécs&companyName=Példa",
		);
		expect(queryRaw).toHaveBeenCalledOnce();
		expect(queryRaw.mock.calls[0][1]).toEqual([
			"Példa",
			"Pécs",
			"Péter",
			"Győr",
			"tábor",
		]);
	});

	it("runs no fold query without text filters", async () => {
		findMany.mockResolvedValue([]);
		count.mockResolvedValue(0);
		await call("?year=2026");
		expect(queryRaw).not.toHaveBeenCalled();
	});

	it("filters by year and defaults to newest first", async () => {
		findMany.mockResolvedValue([]);
		count.mockResolvedValue(0);
		await call("?year=2026&companyName=acme&instructor=béla&q=python");
		const args = findMany.mock.calls[0][0];
		expect(args.orderBy[0]).toEqual({ from: "desc" });
		// The folded search columns stay out of the response.
		expect(args.omit).toEqual({
			nameSearch: true,
			locationSearch: true,
			companySearch: true,
			instructorSearch: true,
		});
		expect(args.where.AND).toEqual([
			{
				from: {
					gte: new Date("2025-12-31T23:00:00Z"),
					lt: new Date("2026-12-31T23:00:00Z"),
				},
			},
			{ companySearch: { contains: "acme" } },
			{ instructorSearch: { contains: "bela" } },
			{ nameSearch: { contains: "python" } },
		]);
		expect(groupBy).not.toHaveBeenCalled();
	});

	it("sorts by partner company with programs without one last", async () => {
		findMany.mockResolvedValue([]);
		count.mockResolvedValue(0);
		await call("?sort=companyName&order=desc");
		expect(findMany.mock.calls[0][0].orderBy[0]).toEqual({
			companyName: { sort: "desc", nulls: "last" },
		});
	});

	it("filters by tags (any match), repeated params only, deduplicated", async () => {
		findMany.mockResolvedValue([]);
		count.mockResolvedValue(0);
		await call("?tags=robotika&tags=kezd%C5%91&tags=robotika&tags=%20");
		expect(findMany.mock.calls[0][0].where.AND).toEqual([
			{ tags: { hasSome: ["robotika", "kezdő"] } },
		]);
	});

	it("filters by place (location or partner) and phase", async () => {
		findMany.mockResolvedValue([]);
		count.mockResolvedValue(0);
		await call("?place=pécs&phase=planned");
		const [place, phase] = findMany.mock.calls[0][0].where.AND;
		expect(place).toEqual({
			OR: [
				{ locationSearch: { contains: "pecs" } },
				{ companySearch: { contains: "pecs" } },
			],
		});
		expect(phase).toEqual({ to: { gte: expect.any(Date) } });
	});

	it("rejects an unknown phase, including the former `active`", async () => {
		const res = await call("?phase=draft");
		expect(res.status).toBe(400);
		expect((await call("?phase=active")).status).toBe(400);
		expect(findMany).not.toHaveBeenCalled();
	});

	it("accepts a well-formed tag that no program uses (it just matches nothing)", async () => {
		findMany.mockResolvedValue([]);
		count.mockResolvedValue(0);
		const res = await call("?tags=Nemletezik");
		expect(res.status).toBe(200);
		expect(findMany.mock.calls[0][0].where.AND).toEqual([
			{ tags: { hasSome: ["nemletezik"] } },
		]);
	});

	it("rejects a malformed tag", async () => {
		const res = await call(`?tags=${"a".repeat(31)}`);
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
		expect(await res.json()).toEqual({ error: "Unauthorized" });
		expect(create).not.toHaveBeenCalled();
	});

	it("rejects invalid bodies", async () => {
		const malformed = await post("{");
		expect(malformed.status).toBe(400);
		expect(await malformed.json()).toEqual({
			error: "Invalid request body",
		});
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

	it("rejects an end one day before the start with an error on `to`", async () => {
		const res = await post({
			name: "Tábor",
			from: "2026-07-02T08:00:00Z",
			to: "2026-07-01T08:00:00Z",
		});
		expect(res.status).toBe(400);
		const { fieldErrors } = (await res.json()).details;
		expect(fieldErrors).toHaveProperty("to");
		expect(fieldErrors).not.toHaveProperty("from");
		expect(create).not.toHaveBeenCalled();
	});

	it("rejects a blank name and a negative capacity", async () => {
		const res = await post({
			name: "   ",
			from: "2026-07-01T08:00:00Z",
			to: "2026-07-05T16:00:00Z",
			capacity: -1,
		});
		expect(res.status).toBe(400);
		const { fieldErrors } = (await res.json()).details;
		expect(fieldErrors).toHaveProperty("name");
		expect(fieldErrors).toHaveProperty("capacity");
		expect(create).not.toHaveBeenCalled();
	});

	it("rejects an invalid sheet URL", async () => {
		const res = await post({
			name: "Tábor",
			from: "2026-07-01T08:00:00Z",
			to: "2026-07-05T16:00:00Z",
			applicationSheetUrl: "not a url",
		});
		expect(res.status).toBe(400);
		expect((await res.json()).details.fieldErrors).toHaveProperty(
			"applicationSheetUrl",
		);
		expect(create).not.toHaveBeenCalled();
	});

	it("defaults capacity to 0 and stores blank optional text as null", async () => {
		create.mockResolvedValue({ id: "e2" });
		const res = await post({
			name: "Tábor",
			from: "2026-07-01T08:00:00Z",
			to: "2026-07-05T16:00:00Z",
			location: "",
			instructor: "  ",
			applicationSheetUrl: null,
		});
		expect(res.status).toBe(201);
		const { data } = create.mock.calls[0][0];
		expect(data).toMatchObject({
			capacity: 0,
			tags: [],
			mentors: [],
			location: null,
			instructor: null,
			applicationSheetUrl: null,
		});
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
