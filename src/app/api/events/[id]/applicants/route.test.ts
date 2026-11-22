// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, findMany, count, getSession, queryRaw } = vi.hoisted(
	() => ({
		findUnique: vi.fn(),
		findMany: vi.fn(),
		count: vi.fn(),
		getSession: vi.fn(),
		queryRaw: vi.fn(),
	}),
);
vi.mock("next-auth", () => ({ getServerSession: getSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({
	db: {
		event: { findUnique },
		application: { findMany, count },
		$queryRaw: queryRaw,
	},
}));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

import { GET } from "./route";

const call = (qs = "") =>
	GET(new Request(`http://x/api/events/e1/applicants${qs}`), {
		params: Promise.resolve({ id: "e1" }),
	});

describe("GET /api/events/[id]/applicants", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		getSession.mockResolvedValue({ user: {} });
		findUnique.mockResolvedValue({ id: "e1" });
		findMany.mockResolvedValue([]);
		count.mockResolvedValue(0);
	});

	it("rejects unauthenticated requests", async () => {
		getSession.mockResolvedValue(null);
		const res = await call();
		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({ error: "Unauthorized" });
		expect(findUnique).not.toHaveBeenCalled();
	});

	it("searches the folded name and e-mail, ignoring accents", async () => {
		// Stands in for lower(unaccent(…)) in the database.
		queryRaw.mockResolvedValue([{ folded: "kovacs" }, { folded: "anna" }]);
		await call("?q=Kovács%20Anna");
		expect(queryRaw.mock.calls[0][1]).toEqual(["Kovács", "Anna"]);
		expect(findMany.mock.calls[0][0].where.applicant).toEqual({
			deletedAt: null,
			AND: [
				{ searchText: { contains: "kovacs" } },
				{ searchText: { contains: "anna" } },
			],
		});
	});

	it("returns 404 for unknown events", async () => {
		findUnique.mockResolvedValue(null);
		expect((await call()).status).toBe(404);
	});

	it("rejects unknown statuses", async () => {
		expect((await call("?status=FOO")).status).toBe(400);
	});

	it("filters by multiple statuses and sorts by applicant name", async () => {
		await call("?status=APPLIED,WAITLISTED&sort=lastName&order=desc");
		const args = findMany.mock.calls[0][0];
		expect(args.where).toEqual({
			eventId: "e1",
			status: { in: ["APPLIED", "WAITLISTED"] },
			applicant: { deletedAt: null },
		});
		expect(args.orderBy).toEqual([
			{ applicant: { lastName: "desc" } },
			{ applicant: { firstName: "desc" } },
			{ id: "asc" },
		]);
		expect(args.include).toEqual({ applicant: true });
	});
});
