// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
	eventFindUnique,
	applicationCount,
	feedbackFindMany,
	documentFindMany,
} = vi.hoisted(() => ({
	eventFindUnique: vi.fn(),
	applicationCount: vi.fn(),
	feedbackFindMany: vi.fn(),
	documentFindMany: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
	db: {
		event: { findUnique: eventFindUnique },
		application: { count: applicationCount },
		feedback: { findMany: feedbackFindMany },
		eventReportDocument: { findMany: documentFindMany },
	},
}));

import { getEventReport } from "./load";

describe("getEventReport", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		eventFindUnique.mockResolvedValue({
			id: "e1",
			name: "Python ősz",
			companyName: null,
			from: new Date("2026-10-01T08:00:00Z"),
			to: new Date("2026-10-03T16:00:00Z"),
			location: null,
			ageRange: null,
			description: null,
			instructor: null,
			mentors: [],
			report: null,
		});
		applicationCount.mockResolvedValue(12);
		feedbackFindMany.mockResolvedValue([]);
		documentFindMany.mockResolvedValue([]);
	});

	it("counts ATTENDED applications of anonymized applicants as participants", async () => {
		const report = await getEventReport("e1");
		expect(applicationCount).toHaveBeenCalledTimes(1);
		expect(applicationCount.mock.calls[0][0].where).toEqual({
			eventId: "e1",
			status: "ATTENDED",
		});
		expect(report?.participants).toBe(12);
	});

	it("returns null for an unknown event", async () => {
		eventFindUnique.mockResolvedValue(null);
		expect(await getEventReport("missing")).toBeNull();
		expect(applicationCount).not.toHaveBeenCalled();
	});
});
