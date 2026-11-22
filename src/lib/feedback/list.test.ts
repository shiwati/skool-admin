// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { feedback, applicationCount, queryRaw } = vi.hoisted(() => ({
	feedback: {
		count: vi.fn(),
		findMany: vi.fn(),
		aggregate: vi.fn(),
		groupBy: vi.fn(),
	},
	applicationCount: vi.fn(),
	queryRaw: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
	db: {
		feedback,
		application: { count: applicationCount },
		$queryRaw: queryRaw,
	},
}));

import { listFeedback, parseFeedbackQuery } from "./list";

describe("feedback period filter", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		feedback.count.mockResolvedValue(0);
		feedback.findMany.mockResolvedValue([]);
		feedback.aggregate.mockResolvedValue({
			_count: { _all: 0 },
			_avg: { overallScore: null },
		});
		feedback.groupBy.mockResolvedValue([]);
	});

	it("accepts a four-digit year and drops anything else", () => {
		expect(parseFeedbackQuery({ period: "2025" }).period).toBe("2025");
		expect(parseFeedbackQuery({ period: "last" }).period).toBeUndefined();
	});

	it("filters by the program start in the Budapest calendar year, like the dashboard", async () => {
		await listFeedback(
			parseFeedbackQuery({ period: "2026", role: "PARTICIPANT" }),
		);
		const expected = {
			role: "PARTICIPANT",
			event: {
				from: {
					gte: new Date("2025-12-31T23:00:00Z"),
					lt: new Date("2026-12-31T23:00:00Z"),
				},
			},
		};
		expect(feedback.count.mock.calls[0][0].where).toEqual(expected);
		expect(feedback.aggregate.mock.calls[0][0].where).toEqual(expected);
	});

	it("does not filter by time without a period", async () => {
		await listFeedback(parseFeedbackQuery({}));
		expect(feedback.count.mock.calls[0][0].where).toEqual({});
	});

	it("filters by the company of the program", async () => {
		await listFeedback(parseFeedbackQuery({ company: " Alfa Zrt. " }));
		expect(feedback.count.mock.calls[0][0].where).toEqual({
			event: { companyName: "Alfa Zrt." },
		});
	});

	it("combines the company with the year on the same event filter", async () => {
		await listFeedback(
			parseFeedbackQuery({ company: "Alfa Zrt.", period: "2026" }),
		);
		expect(feedback.count.mock.calls[0][0].where).toEqual({
			event: {
				companyName: "Alfa Zrt.",
				from: {
					gte: new Date("2025-12-31T23:00:00Z"),
					lt: new Date("2026-12-31T23:00:00Z"),
				},
			},
		});
	});
});

describe("feedback response rate", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		feedback.count.mockResolvedValue(3);
		feedback.findMany.mockResolvedValue([]);
		feedback.aggregate.mockResolvedValue({
			_count: { _all: 3 },
			_avg: { overallScore: 4 },
		});
		feedback.groupBy.mockImplementation(async ({ by }) =>
			by[0] === "eventId" ? [{ eventId: "e1", _count: { _all: 3 } }] : [],
		);
		applicationCount.mockResolvedValue(4);
	});

	it("counts anonymized attendees in the Kitöltési arány denominator", async () => {
		const page = await listFeedback(parseFeedbackQuery({}));
		expect(applicationCount).toHaveBeenCalledTimes(1);
		expect(applicationCount.mock.calls[0][0].where).toEqual({
			status: "ATTENDED",
			eventId: { in: ["e1"] },
		});
		expect(page.stats.responseRate).toBe(3 / 4);
	});
});

describe("parseFeedbackQuery", () => {
	it("falls back to defaults for an invalid role or page", () => {
		expect(parseFeedbackQuery({ role: "ADMIN", page: "abc" })).toEqual({
			page: 1,
		});
		expect(parseFeedbackQuery({ page: "0" }).page).toBe(1);
		expect(parseFeedbackQuery({ page: "-3" }).page).toBe(1);
		expect(parseFeedbackQuery({ role: "MENTOR", page: "3" })).toEqual({
			role: "MENTOR",
			page: 3,
		});
	});

	it("uses the first value of a repeated parameter", () => {
		expect(
			parseFeedbackQuery({
				role: ["MENTOR", "PARTICIPANT"],
				page: ["2", "5"],
				q: ["pizza", "tészta"],
			}),
		).toEqual({ role: "MENTOR", page: 2, q: "pizza" });
	});
});

describe("feedback stats", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		queryRaw.mockImplementation(async (_sql: unknown, texts: string[]) =>
			texts.map((text) => ({ folded: text.toLowerCase() })),
		);
		feedback.count.mockResolvedValue(3);
		feedback.findMany.mockResolvedValue([]);
		feedback.aggregate.mockResolvedValue({
			_count: { _all: 3 },
			_avg: { overallScore: 4 },
		});
		feedback.groupBy.mockImplementation(async ({ by }) =>
			by[0] === "eventId" ? [{ eventId: "e1", _count: { _all: 3 } }] : [],
		);
		applicationCount.mockResolvedValue(4);
	});

	it("has no response rate while a text search is active", async () => {
		const page = await listFeedback(parseFeedbackQuery({ q: "pizza" }));
		expect(page.stats.responseRate).toBeNull();
		expect(applicationCount).not.toHaveBeenCalled();
	});

	it("has no response rate when only mentors are shown", async () => {
		const page = await listFeedback(parseFeedbackQuery({ role: "MENTOR" }));
		expect(page.stats.responseRate).toBeNull();
		expect(applicationCount).not.toHaveBeenCalled();
	});

	it("has no response rate without an attended applicant", async () => {
		applicationCount.mockResolvedValue(0);
		const page = await listFeedback(parseFeedbackQuery({}));
		expect(page.stats.responseRate).toBeNull();
	});

	it("computes the recommend rate as yes over all answers", async () => {
		feedback.groupBy.mockImplementation(async ({ by }) =>
			by[0] === "recommend"
				? [
						{ recommend: "yes", _count: { _all: 3 } },
						{ recommend: "maybe", _count: { _all: 2 } },
						{ recommend: "no", _count: { _all: 1 } },
					]
				: [],
		);
		const page = await listFeedback(parseFeedbackQuery({}));
		expect(page.stats).toMatchObject({
			count: 3,
			averageScore: 4,
			recommendRate: 3 / 6,
		});
	});

	it("has no recommend rate without recommend answers", async () => {
		const page = await listFeedback(parseFeedbackQuery({}));
		expect(page.stats.recommendRate).toBeNull();
	});
});

describe("feedback text search", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		feedback.count.mockResolvedValue(0);
		feedback.findMany.mockResolvedValue([]);
		feedback.aggregate.mockResolvedValue({
			_count: { _all: 0 },
			_avg: { overallScore: null },
		});
		feedback.groupBy.mockResolvedValue([]);
	});

	it("matches the folded phrase, ignoring case and accents", async () => {
		// Stands in for lower(unaccent(…)) in the database.
		queryRaw.mockResolvedValue([{ folded: "elveztem a tabort" }]);
		await listFeedback(parseFeedbackQuery({ q: "Élveztem a tábort" }));

		expect(queryRaw).toHaveBeenCalledOnce();
		expect(queryRaw.mock.calls[0][1]).toEqual(["Élveztem a tábort"]);
		expect(feedback.findMany.mock.calls[0][0].where).toEqual({
			searchText: { contains: "elveztem a tabort" },
		});
		// The statistics use the same filter.
		expect(feedback.aggregate.mock.calls[0][0].where).toEqual({
			searchText: { contains: "elveztem a tabort" },
		});
	});

	it("runs no fold query without a search", async () => {
		await listFeedback(parseFeedbackQuery({}));
		expect(queryRaw).not.toHaveBeenCalled();
	});
});
