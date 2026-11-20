// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
	applicationCount,
	applicationFindMany,
	eventFindMany,
	feedbackFindMany,
} = vi.hoisted(() => ({
	applicationCount: vi.fn(),
	applicationFindMany: vi.fn(),
	eventFindMany: vi.fn(),
	feedbackFindMany: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
	db: {
		application: { count: applicationCount, findMany: applicationFindMany },
		event: { findMany: eventFindMany },
		feedback: { findMany: feedbackFindMany },
	},
}));

import { loadDashboard } from "./load";

const now = new Date("2026-11-19T10:00:00Z");
const range = (year: number) => ({
	gte: new Date(`${year - 1}-12-31T23:00:00Z`),
	lt: new Date(`${year}-12-31T23:00:00Z`),
});

const events = [
	{
		id: "a",
		name: "Python ősz",
		from: new Date("2026-10-01T08:00:00Z"),
		to: new Date("2026-12-01T16:00:00Z"),
		capacity: 20,
		_count: { applications: 50 },
	},
	{
		id: "b",
		name: "Robotika tél",
		from: new Date("2025-12-01T08:00:00Z"),
		to: new Date("2025-12-05T16:00:00Z"),
		capacity: 10,
		_count: { applications: 15 },
	},
	{
		id: "c",
		name: "Tavaszi tábor",
		from: new Date("2026-03-01T08:00:00Z"),
		to: new Date("2026-03-03T16:00:00Z"),
		capacity: 10,
		_count: { applications: 5 },
	},
];

describe("loadDashboard", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		eventFindMany
			// program list of the period
			.mockResolvedValueOnce([
				{ id: "a", name: "Python ősz" },
				{ id: "c", name: "Tavaszi tábor" },
			])
			.mockResolvedValueOnce(events);
		applicationCount.mockResolvedValueOnce(120).mockResolvedValueOnce(100);
		const fb = (
			eventId: string,
			name: string,
			from: string,
			role: "PARTICIPANT" | "MENTOR",
			overallScore: number | null,
			recommend: string | null,
		) => ({
			eventId,
			role,
			overallScore,
			recommend,
			event: { name, from: new Date(from) },
		});
		feedbackFindMany.mockResolvedValue([
			fb(
				"a",
				"Python ősz",
				"2026-10-01T08:00:00Z",
				"PARTICIPANT",
				5,
				"yes",
			),
			fb(
				"a",
				"Python ősz",
				"2026-10-01T08:00:00Z",
				"PARTICIPANT",
				4,
				"maybe",
			),
			fb("a", "Python ősz", "2026-10-01T08:00:00Z", "MENTOR", 3, null),
			fb(
				"c",
				"Tavaszi tábor",
				"2026-03-01T08:00:00Z",
				"PARTICIPANT",
				null,
				"no",
			),
			// Previous period (program started in 2025).
			fb(
				"b",
				"Robotika tél",
				"2025-12-01T08:00:00Z",
				"PARTICIPANT",
				2,
				"no",
			),
		]);
		applicationFindMany.mockResolvedValue([
			{
				event: { from: new Date("2026-10-01T08:00:00Z") },
				applicant: { birthYear: 2012, hometown: "Ózd" },
			},
			// The same applicant on another program counts again.
			{
				event: { from: new Date("2026-03-01T08:00:00Z") },
				applicant: { birthYear: 2012, hometown: "Ózd" },
			},
			{
				event: { from: new Date("2026-03-01T08:00:00Z") },
				applicant: { birthYear: null, hometown: null },
			},
		]);
	});

	it("counts applications (not distinct applicants) of non-deleted applicants", async () => {
		const data = await loadDashboard({}, now);
		expect(applicationCount.mock.calls.map((c) => c[0].where)).toEqual([
			{ applicant: { deletedAt: null }, receivedAt: range(2026) },
			{ applicant: { deletedAt: null }, receivedAt: range(2025) },
		]);
		expect(data.applications).toEqual({ current: 120, previous: 100 });
		expect(data.period).toEqual({
			key: "2026",
			label: "2026 (idei év)",
			previousLabel: "2025",
		});
		expect(data.program).toBeNull();
	});

	it("counts only applications of non-deleted applicants per event", async () => {
		await loadDashboard({}, now);
		expect(eventFindMany.mock.calls[1][0].select._count).toEqual({
			select: {
				applications: { where: { applicant: { deletedAt: null } } },
			},
		});
	});

	it("compares oversubscription of events starting in each period", async () => {
		const data = await loadDashboard({}, now);
		expect(data.oversubscription).toEqual({
			current: 55 / 30,
			previous: 1.5,
		});
	});

	it("shows the events starting in the period in the capacity chart", async () => {
		const data = await loadDashboard({}, now);
		expect(data.capacity.map((r) => [r.id, r.state])).toEqual([
			["a", "upcoming"],
			["c", "past"],
		]);
	});

	it("builds demographics per application of the period", async () => {
		const data = await loadDashboard({}, now);
		expect(applicationFindMany.mock.calls[0][0].where).toEqual({
			applicant: { deletedAt: null },
			event: { from: range(2026) },
		});
		expect(data.demographics.total).toBe(3);
		expect(data.demographics.age).toContainEqual({
			label: "13–15",
			count: 2,
		});
		expect(data.demographics.hometown).toEqual([
			{ label: "Ózd", count: 2 },
			{ label: "Nincs adat", count: 1 },
		]);
	});

	it("restricts every query to the selected program of the period", async () => {
		const data = await loadDashboard({ program: "a" }, now);
		expect(data.program).toEqual({ id: "a", name: "Python ősz" });
		expect(applicationCount.mock.calls[0][0].where.eventId).toBe("a");
		expect(applicationFindMany.mock.calls[0][0].where.eventId).toBe("a");
		expect(eventFindMany.mock.calls[1][0].where.id).toBe("a");
	});

	it("ignores a program that does not start in the period", async () => {
		const data = await loadDashboard({ program: "b" }, now);
		expect(data.program).toBeNull();
		expect(applicationCount.mock.calls[0][0].where.eventId).toBeUndefined();
	});

	it("returns six trend months ending with the current one", async () => {
		const data = await loadDashboard({ period: "2025" }, now);
		expect(data.trend.map((p) => p.key)).toEqual([
			"2026-06",
			"2026-07",
			"2026-08",
			"2026-09",
			"2026-10",
			"2026-11",
		]);
		expect(data.trend[4].ratio).toBe(2.5);
	});

	it("splits satisfaction by role and assigns feedback by program start", async () => {
		const data = await loadDashboard({}, now);
		expect(feedbackFindMany.mock.calls[0][0].where).toEqual({
			event: {
				from: { gte: range(2025).gte, lt: range(2026).lt },
			},
		});
		const { current, previous } = data.satisfaction;
		expect(current.PARTICIPANT.score).toEqual({ average: 4.5, count: 2 });
		expect(current.PARTICIPANT.responses).toBe(3);
		expect(current.PARTICIPANT.recommend).toEqual({
			yes: 1,
			maybe: 1,
			no: 1,
			total: 3,
		});
		expect(current.MENTOR.score).toEqual({ average: 3, count: 1 });
		expect(previous.PARTICIPANT.score).toEqual({ average: 2, count: 1 });
		expect(
			data.satisfactionByProgram.map((p) => [
				p.id,
				p.participant.average,
				p.mentor.average,
			]),
		).toEqual([
			["a", 4.5, 3],
			["c", null, null],
		]);
	});

	it("restricts feedback to the selected program", async () => {
		await loadDashboard({ program: "a" }, now);
		expect(feedbackFindMany.mock.calls[0][0].where.eventId).toBe("a");
	});
});
