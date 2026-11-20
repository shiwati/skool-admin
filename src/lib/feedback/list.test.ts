// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { feedback, applicationCount } = vi.hoisted(() => ({
	feedback: {
		count: vi.fn(),
		findMany: vi.fn(),
		aggregate: vi.fn(),
		groupBy: vi.fn(),
	},
	applicationCount: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
	db: { feedback, application: { count: applicationCount } },
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
});
