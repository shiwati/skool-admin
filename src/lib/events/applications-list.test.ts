// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany, count } = vi.hoisted(() => ({
	findMany: vi.fn(),
	count: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: { application: { findMany, count } } }));

import { DEFAULT_APPLICATIONS_VIEW } from "./applications-params";
import { loadEventApplicationsPage } from "./applications-list";

describe("loadEventApplicationsPage", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		count.mockResolvedValue(1);
		findMany.mockResolvedValue([
			{
				id: "a1",
				eventId: "e1",
				status: "APPLIED",
				receivedAt: new Date("2026-11-01T10:00:00Z"),
				applicant: {
					id: "p1",
					firstName: "Anna",
					lastName: "Kiss",
					email: "kiss@example.com",
					birthYear: 2010,
					hometown: "Győr",
					schoolName: "Teszt Gimi",
					duplicateFlag: false,
					newsletter: true,
					parentAddress: "Titkos utca 1.",
					parentEmail: "szulo@example.com",
				},
			},
		]);
	});

	it("loads the default view, hiding deleted applicants", async () => {
		await loadEventApplicationsPage("e1", DEFAULT_APPLICATIONS_VIEW);
		const args = findMany.mock.calls[0][0];
		expect(args.where).toEqual({
			eventId: "e1",
			applicant: { deletedAt: null },
		});
		expect(args.orderBy).toEqual([{ receivedAt: "asc" }, { id: "asc" }]);
		expect(args.skip).toBe(0);
		expect(args.take).toBe(25);
	});

	it("returns only the table's fields, dates as ISO strings", async () => {
		const { apiQuery, data } = await loadEventApplicationsPage(
			"e1",
			DEFAULT_APPLICATIONS_VIEW,
		);
		expect(apiQuery).toBe("sort=receivedAt&order=asc&page=1&pageSize=25");
		expect(data).toEqual({
			total: 1,
			page: 1,
			pageSize: 25,
			items: [
				{
					id: "a1",
					status: "APPLIED",
					receivedAt: "2026-11-01T10:00:00.000Z",
					applicant: {
						id: "p1",
						firstName: "Anna",
						lastName: "Kiss",
						email: "kiss@example.com",
						birthYear: 2010,
						hometown: "Győr",
						schoolName: "Teszt Gimi",
						duplicateFlag: false,
						newsletter: true,
					},
				},
			],
		});
	});

	it("sorts by age as youngest first, without birth year last", async () => {
		await loadEventApplicationsPage("e1", {
			...DEFAULT_APPLICATIONS_VIEW,
			sort: "age",
			status: "WAITLISTED",
		});
		const args = findMany.mock.calls[0][0];
		expect(args.orderBy).toEqual([
			{ applicant: { birthYear: { sort: "desc", nulls: "last" } } },
			{ id: "asc" },
		]);
		expect(args.where.status).toEqual({ in: ["WAITLISTED"] });
	});
});
