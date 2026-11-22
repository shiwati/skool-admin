import { describe, expect, it } from "vitest";
import {
	ageFit,
	companyDetail,
	companyRanking,
	feedbackCompletion,
	funnel,
	overviewStats,
	parseAgeRange,
	type OverviewApplicant,
} from "./insights";

describe("parseAgeRange", () => {
	it("parses 'min-max'", () => {
		expect(parseAgeRange("12-16")).toEqual({ min: 12, max: 16 });
		expect(parseAgeRange(" 10 - 14 ")).toEqual({ min: 10, max: 14 });
	});

	it("rejects missing, reversed and free-text values", () => {
		expect(parseAgeRange(null)).toBeNull();
		expect(parseAgeRange("16-12")).toBeNull();
		expect(parseAgeRange("középiskolás")).toBeNull();
	});
});

describe("ageFit", () => {
	it("splits known ages into within / below / above, ignoring unknown", () => {
		expect(
			ageFit([11, 12, 14, 16, 17, null], { min: 12, max: 16 }),
		).toEqual({
			range: { min: 12, max: 16 },
			known: 5,
			within: 3,
			below: 1,
			above: 1,
		});
	});
});

describe("funnel", () => {
	it("counts accepted including attended, and each side status", () => {
		expect(
			funnel({
				APPLIED: 4,
				ACCEPTED: 6,
				ATTENDED: 3,
				REJECTED: 2,
				WAITLISTED: 1,
			}),
		).toEqual({
			total: 16,
			accepted: 9,
			attended: 3,
			rejected: 2,
			waitlisted: 1,
			pending: 4,
		});
	});

	it("is all zero without applications", () => {
		expect(funnel({}).total).toBe(0);
	});
});

describe("companyRanking", () => {
	it("groups spellings and ranks every company by number of programs", () => {
		expect(
			companyRanking([
				{ companyName: "Minta Kft.", applications: 10 },
				{ companyName: " minta kft. ", applications: 5 },
				{ companyName: "Példa Zrt.", applications: 20 },
				{ companyName: "Harmadik Bt.", applications: 3 },
				{ companyName: null, applications: 99 },
				{ companyName: "  ", applications: 99 },
			]),
		).toEqual([
			{ name: "Minta Kft.", applications: 15, programs: 2 },
			{ name: "Példa Zrt.", applications: 20, programs: 1 },
			{ name: "Harmadik Bt.", applications: 3, programs: 1 },
		]);
	});

	it("breaks a tie in programs by applications, then by name", () => {
		const result = companyRanking([
			{ companyName: "Béta", applications: 5 },
			{ companyName: "Alfa", applications: 5 },
			{ companyName: "Gamma", applications: 9 },
		]);
		expect(result.map((c) => c.name)).toEqual(["Gamma", "Alfa", "Béta"]);
	});
});

describe("companyDetail", () => {
	const event = (
		id: string,
		from: string,
		mentors: string[],
		applications = 10,
	) => ({
		id,
		name: id,
		from: new Date(from),
		to: new Date(from),
		capacity: 20,
		applications,
		mentors,
	});
	const fb = (
		eventId: string,
		role: "PARTICIPANT" | "MENTOR",
		overallScore: number | null,
	) => ({ eventId, role, overallScore, recommend: null });

	const detail = companyDetail(
		"Alfa",
		[
			event("old", "2024-03-01", ["Kiss Anna", " kiss anna ", ""]),
			event("new", "2025-03-01", ["Kiss Anna", "Nagy Béla"]),
		],
		17,
		[
			fb("old", "PARTICIPANT", 3),
			fb("new", "PARTICIPANT", 5),
			fb("new", "PARTICIPANT", 4),
			fb("new", "MENTOR", 2),
			fb("old", "MENTOR", null),
		],
	);

	it("counts a mentor of several programs once", () => {
		expect(detail.mentors).toBe(2);
	});

	it("passes the program and student counts through", () => {
		expect(detail.programs).toBe(2);
		expect(detail.students).toBe(17);
	});

	it("summarises feedback and lists programs newest first with their rating", () => {
		expect(detail.satisfaction.PARTICIPANT.responses).toBe(3);
		expect(detail.satisfaction.MENTOR.responses).toBe(2);
		expect(detail.rows.map((r) => [r.id, r.rating])).toEqual([
			["new", 4.5],
			["old", 3],
		]);
	});

	it("has no rating for a program without participant scores", () => {
		const empty = companyDetail(
			"Béta",
			[event("x", "2025-01-01", [])],
			0,
			[],
		);
		expect(empty.rows[0].rating).toBeNull();
		expect(empty.mentors).toBe(0);
	});
});

describe("overviewStats", () => {
	const app = (eventId: string, year: number, heard: string | null) => ({
		eventId,
		eventFrom: new Date(`${year}-06-01T08:00:00Z`),
		heardFromWhere: heard,
	});
	const applicants: OverviewApplicant[] = [
		{
			birthYear: 2012,
			hometown: "Ózd",
			newsletter: true,
			applications: [app("a", 2024, "iskola"), app("b", 2026, "iskola")],
		},
		{
			birthYear: 2013,
			hometown: "Ózd",
			newsletter: false,
			applications: [app("a", 2024, "barát")],
		},
		{ birthYear: null, hometown: null, newsletter: true, applications: [] },
	];

	it("counts students and newsletter subscribers", () => {
		const stats = overviewStats(applicants);
		expect(stats.students).toBe(3);
		expect(stats.newsletter).toBe(2);
	});

	it("counts returning among students with an application", () => {
		expect(overviewStats(applicants).returning).toEqual({
			returning: 1,
			total: 2,
		});
	});

	it("does not count two applications to the same program as returning", () => {
		const stats = overviewStats([
			{
				birthYear: 2012,
				hometown: null,
				newsletter: false,
				applications: [app("a", 2024, null), app("a", 2024, null)],
			},
		]);
		expect(stats.returning).toEqual({ returning: 0, total: 1 });
	});

	it("takes the age at the student's latest program", () => {
		const { demographics } = overviewStats(applicants);
		expect(demographics.total).toBe(3);
		// 2026 − 2012 = 14; 2024 − 2013 = 11; third student has no age.
		expect(demographics.age).toContainEqual({ label: "13–15", count: 1 });
		expect(demographics.age).toContainEqual({ label: "10–12", count: 1 });
		expect(demographics.age).toContainEqual({
			label: "Nincs adat",
			count: 1,
		});
	});

	it("groups the heard-from answers per application", () => {
		expect(overviewStats(applicants).channels).toEqual([
			{ label: "iskola", count: 2 },
			{ label: "barát", count: 1 },
		]);
	});

	describe("for a single year", () => {
		const range = {
			gte: new Date("2025-12-31T23:00:00Z"),
			lt: new Date("2026-12-31T23:00:00Z"),
		};

		it("keeps only students with an application in the year", () => {
			const stats = overviewStats(applicants, range);
			expect(stats.students).toBe(1);
			expect(stats.newsletter).toBe(1);
			expect(stats.demographics.total).toBe(1);
		});

		it("counts as returning who applied before the year", () => {
			expect(overviewStats(applicants, range).returning).toEqual({
				returning: 1,
				total: 1,
			});
		});

		it("does not count a first-time applicant as returning", () => {
			const first = [
				{
					birthYear: 2012,
					hometown: null,
					newsletter: false,
					applications: [app("a", 2026, null)],
				},
			];
			expect(overviewStats(first, range).returning).toEqual({
				returning: 0,
				total: 1,
			});
		});

		it("groups only the applications of the year by channel", () => {
			expect(overviewStats(applicants, range).channels).toEqual([
				{ label: "iskola", count: 1 },
			]);
		});
	});
});

describe("feedbackCompletion", () => {
	const events = [
		{ id: "a", mentors: ["Anna", "Béla", " "] },
		{ id: "b", mentors: [] },
		{ id: "c", mentors: ["Cili"] },
	];
	const attended = new Map([
		["a", 10],
		["b", 5],
	]);
	const responses = [
		{ eventId: "a", role: "PARTICIPANT" as const, count: 6 },
		{ eventId: "a", role: "MENTOR" as const, count: 2 },
		{ eventId: "b", role: "PARTICIPANT" as const, count: 4 },
		{ eventId: "b", role: "MENTOR" as const, count: 1 },
		{ eventId: "c", role: "PARTICIPANT" as const, count: 9 },
	];

	it("counts participants only where someone is marked as attended", () => {
		expect(
			feedbackCompletion(events, attended, responses).participants,
		).toEqual({ responses: 10, expected: 15 });
	});

	it("counts mentors only where mentors are listed", () => {
		expect(feedbackCompletion(events, attended, responses).mentors).toEqual(
			{
				responses: 2,
				expected: 3,
			},
		);
	});

	it("does not know the expected count without attendees or mentors", () => {
		expect(feedbackCompletion([events[1]], new Map(), responses)).toEqual({
			participants: { responses: 0, expected: null },
			mentors: { responses: 0, expected: null },
		});
	});
});
