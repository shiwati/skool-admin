// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
	applicationGroupBy,
	feedbackGroupBy,
	applicantFindMany,
	applicationFindMany,
	eventFindMany,
	eventFindUnique,
	feedbackFindMany,
} = vi.hoisted(() => ({
	applicationGroupBy: vi.fn(),
	feedbackGroupBy: vi.fn(),
	applicantFindMany: vi.fn(),
	applicationFindMany: vi.fn(),
	eventFindMany: vi.fn(),
	eventFindUnique: vi.fn(),
	feedbackFindMany: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
	db: {
		applicant: { findMany: applicantFindMany },
		application: {
			findMany: applicationFindMany,
			groupBy: applicationGroupBy,
		},
		event: { findMany: eventFindMany, findUnique: eventFindUnique },
		feedback: { findMany: feedbackFindMany, groupBy: feedbackGroupBy },
	},
}));

import {
	loadCompanyDetail,
	loadOverview,
	loadProgramDetail,
} from "./insights-load";

describe("loadOverview", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		applicantFindMany.mockResolvedValue([
			{ id: "s1", birthYear: 2012, hometown: "Ózd", newsletter: true },
			{
				id: "s2",
				birthYear: 2013,
				hometown: "Miskolc",
				newsletter: false,
			},
		]);
		applicationFindMany.mockResolvedValue([
			{ applicantId: "s1", eventId: "a", heardFromWhere: "iskola" },
			{ applicantId: "s1", eventId: "b", heardFromWhere: "iskola" },
			{ applicantId: "s2", eventId: "a", heardFromWhere: null },
		]);
		feedbackFindMany.mockResolvedValue([
			{ role: "PARTICIPANT", overallScore: 5, recommend: "yes" },
			{ role: "PARTICIPANT", overallScore: 4, recommend: "maybe" },
			{ role: "MENTOR", overallScore: 3, recommend: null },
		]);
		// The start of every program (no `where`), and the programs in scope.
		const starts = [
			{ id: "a", from: new Date("2025-10-01T08:00:00Z") },
			{ id: "b", from: new Date("2026-03-01T08:00:00Z") },
			{ id: "c", from: new Date("2026-05-01T08:00:00Z") },
		];
		eventFindMany.mockImplementation(async (args: { where?: unknown }) =>
			args.where === undefined ? starts : programs,
		);
		const programs = [
			{
				id: "a",
				mentors: ["Anna", " "],
				companyName: "Minta Kft.",
				_count: { applications: 2 },
			},
			{
				id: "b",
				mentors: [],
				companyName: "minta kft.",
				_count: { applications: 1 },
			},
			{
				id: "c",
				mentors: [],
				companyName: null,
				_count: { applications: 5 },
			},
		];
	});

	it("counts anonymized applicants and their applications too", async () => {
		await loadOverview();
		expect(applicantFindMany.mock.calls[0][0].where).toEqual({});
		expect(applicationFindMany.mock.calls[0][0].where).toEqual({});
		expect(eventFindMany.mock.calls[0][0].select._count).toEqual({
			select: { applications: true },
		});
	});

	it("restricts programs and applicants to the programs of a year", async () => {
		const range = {
			gte: new Date("2025-12-31T23:00:00Z"),
			lt: new Date("2026-12-31T23:00:00Z"),
		};
		await loadOverview(range);
		const scope = { applications: { some: { event: { from: range } } } };
		expect(applicantFindMany.mock.calls[0][0].where).toEqual(scope);
		// Every application of those applicants: earlier years make them returning.
		expect(applicationFindMany.mock.calls[0][0].where).toEqual({
			applicant: scope,
		});
		expect(eventFindMany.mock.calls[0][0].where).toEqual({ from: range });
		expect(feedbackFindMany.mock.calls[0][0].where).toEqual({
			event: { from: range },
		});
	});

	it("averages the feedback by role", async () => {
		const { satisfaction } = await loadOverview();
		expect(satisfaction.PARTICIPANT.score).toEqual({
			average: 4.5,
			count: 2,
		});
		expect(satisfaction.MENTOR.score).toEqual({ average: 3, count: 1 });
		expect(feedbackFindMany.mock.calls[0][0].where).toEqual({});
	});

	it("measures the feedback completion of a year", async () => {
		applicationGroupBy.mockResolvedValue([
			{ eventId: "a", _count: { _all: 10 } },
			{ eventId: "b", _count: { _all: 0 } },
		]);
		feedbackGroupBy.mockResolvedValue([
			{ eventId: "a", role: "PARTICIPANT", _count: { _all: 6 } },
			{ eventId: "a", role: "MENTOR", _count: { _all: 1 } },
			{ eventId: "b", role: "PARTICIPANT", _count: { _all: 5 } },
		]);
		const range = {
			gte: new Date("2025-12-31T23:00:00Z"),
			lt: new Date("2026-12-31T23:00:00Z"),
		};
		const overview = await loadOverview(range);
		expect(applicationGroupBy.mock.calls[0][0].where).toEqual({
			status: "ATTENDED",
			event: { from: range },
		});
		expect(feedbackGroupBy.mock.calls[0][0].where).toEqual({
			event: { from: range },
		});
		// Program "b" has no attended applicants: its responses are left out.
		expect(overview.completion).toEqual({
			participants: { responses: 6, expected: 10 },
			mentors: { responses: 1, expected: 1 },
		});
	});

	it("has no completion for all years", async () => {
		expect((await loadOverview()).completion).toBeNull();
		expect(applicationGroupBy).not.toHaveBeenCalled();
	});

	it("does not restrict anything for all years", async () => {
		await loadOverview();
		expect(eventFindMany.mock.calls[0][0].where).toEqual({});
	});

	it("totals programs, students, companies and newsletter subscribers", async () => {
		const overview = await loadOverview();
		expect(overview).toMatchObject({
			programs: 3,
			students: 2,
			newsletter: 1,
			returning: { returning: 1, total: 2 },
		});
		expect(overview.companies).toEqual([
			{ name: "Minta Kft.", applications: 3, programs: 2 },
		]);
		expect(overview.channels[0]).toEqual({ label: "iskola", count: 2 });
	});

	it("counts applicants with an earlier-year application as returning in a year", async () => {
		const range = {
			gte: new Date("2025-12-31T23:00:00Z"),
			lt: new Date("2026-12-31T23:00:00Z"),
		};
		applicantFindMany.mockResolvedValue([
			{ id: "s1", birthYear: 2012, hometown: "Ózd", newsletter: true },
		]);
		const overview = await loadOverview(range);
		expect(overview.students).toBe(1);
		expect(overview.returning).toEqual({ returning: 1, total: 1 });
	});
});

describe("loadCompanyDetail", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		eventFindMany.mockResolvedValue([
			{
				id: "a",
				name: "Python ősz",
				from: new Date("2026-10-01T08:00:00Z"),
				to: new Date("2026-10-05T16:00:00Z"),
				capacity: 10,
				mentors: ["Anna"],
				_count: { applications: 3 },
			},
		]);
		applicationFindMany.mockResolvedValue([
			{ applicantId: "p1" },
			{ applicantId: "p2" },
		]);
		feedbackFindMany.mockResolvedValue([
			{
				eventId: "a",
				role: "PARTICIPANT",
				overallScore: 4,
				recommend: "yes",
			},
		]);
	});

	it("filters every query by the company's programs", async () => {
		const detail = await loadCompanyDetail("Minta Kft.");
		const byCompany = { event: { companyName: "Minta Kft." } };
		expect(eventFindMany.mock.calls[0][0].where).toEqual({
			companyName: "Minta Kft.",
		});
		expect(applicationFindMany.mock.calls[0][0]).toMatchObject({
			where: byCompany,
			distinct: ["applicantId"],
		});
		expect(feedbackFindMany.mock.calls[0][0].where).toEqual(byCompany);
		expect(detail).toMatchObject({ programs: 1, students: 2 });
	});
});

describe("loadProgramDetail", () => {
	const event = {
		id: "a",
		name: "Python ősz",
		from: new Date("2026-10-01T08:00:00Z"),
		to: new Date("2026-10-05T16:00:00Z"),
		capacity: 4,
		ageRange: "12-16",
		mentors: ["Mentor Anna", " "],
	};
	const row = (
		status: string,
		applicantId: string,
		birthYear: number | null,
		heardFromWhere: string | null = null,
	) => ({
		status,
		heardFromWhere,
		applicantId,
		applicant: { birthYear, hometown: "Ózd" },
	});

	beforeEach(() => {
		vi.resetAllMocks();
		eventFindUnique.mockResolvedValue(event);
		applicationFindMany
			.mockResolvedValueOnce([
				row("ATTENDED", "p1", 2012, "iskola"),
				row("ACCEPTED", "p2", 2013, "iskola"),
				row("REJECTED", "p3", 2005),
				row("APPLIED", "p4", null),
			])
			.mockResolvedValueOnce([{ applicantId: "p1" }]);
		feedbackFindMany.mockResolvedValue([
			{ role: "PARTICIPANT", overallScore: 5, recommend: "yes" },
			{ role: "MENTOR", overallScore: 4, recommend: null },
		]);
	});

	it("returns null for an unknown program", async () => {
		eventFindUnique.mockResolvedValue(null);
		expect(await loadProgramDetail("x")).toBeNull();
	});

	it("builds the funnel and capacity figures from the program's applications", async () => {
		const detail = await loadProgramDetail(
			"a",
			new Date("2026-11-01T00:00:00Z"),
		);
		expect(applicationFindMany.mock.calls[0][0].where).toEqual({
			eventId: "a",
		});
		expect(detail?.funnel).toEqual({
			total: 4,
			accepted: 2,
			attended: 1,
			rejected: 1,
			waitlisted: 0,
			pending: 1,
		});
		expect(detail?.oversubscription).toBe(1);
		expect(detail?.finished).toBe(true);
	});

	it("counts applicants of earlier programs as returning", async () => {
		const detail = await loadProgramDetail("a");
		expect(applicationFindMany.mock.calls[1][0].where).toEqual({
			applicantId: { in: ["p1", "p2", "p3", "p4"] },
			eventId: { not: "a" },
			event: { from: { lt: event.from } },
		});
		expect(detail?.returning).toEqual({ returning: 1, total: 4 });
	});

	it("measures the age fit against the advertised range", async () => {
		const detail = await loadProgramDetail("a");
		// 2026 − 2012 = 14 and 2026 − 2013 = 13 fit; 2026 − 2005 = 21 is above.
		expect(detail?.ageFit).toEqual({
			range: { min: 12, max: 16 },
			known: 3,
			within: 2,
			below: 0,
			above: 1,
		});
	});

	it("has no age fit for an unparseable range", async () => {
		eventFindUnique.mockResolvedValue({ ...event, ageRange: null });
		expect((await loadProgramDetail("a"))?.ageFit).toBeNull();
	});

	it("derives the feedback completion from attendees and mentors", async () => {
		const detail = await loadProgramDetail("a");
		expect(detail?.completion).toEqual({
			participants: { responses: 1, expected: 1 },
			mentors: { responses: 1, expected: 1 },
		});
		expect(detail?.satisfaction.PARTICIPANT.score.average).toBe(5);
	});

	it("does not know the expected participants when nobody is marked as attended", async () => {
		applicationFindMany.mockReset();
		applicationFindMany
			.mockResolvedValueOnce([row("ACCEPTED", "p1", 2012)])
			.mockResolvedValueOnce([]);
		const detail = await loadProgramDetail("a");
		expect(detail?.completion.participants.expected).toBeNull();
		expect(detail?.returning).toEqual({ returning: 0, total: 1 });
	});
});
