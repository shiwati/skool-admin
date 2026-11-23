// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
	applicationCount,
	applicationGroupBy,
	eventFindMany,
	eventAggregate,
	feedbackFindMany,
} = vi.hoisted(() => ({
	applicationCount: vi.fn(),
	applicationGroupBy: vi.fn(),
	eventFindMany: vi.fn(),
	eventAggregate: vi.fn(),
	feedbackFindMany: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
	db: {
		application: {
			count: applicationCount,
			groupBy: applicationGroupBy,
		},
		event: { findMany: eventFindMany, aggregate: eventAggregate },
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
		eventAggregate.mockResolvedValue({
			_min: { from: null },
			_max: { from: null },
		});
		eventFindMany
			// every program, newest first: the program and company filter lists
			.mockResolvedValueOnce([
				{ id: "a", name: "Python ősz", companyName: "Zeta Kft." },
				{ id: "c", name: "Tavaszi tábor", companyName: "Alfa Zrt." },
				{ id: "b", name: "Robotika tél", companyName: "Zeta Kft." },
				{ id: "d", name: "Céltalan", companyName: null },
			])
			.mockResolvedValueOnce(events);
		applicationCount.mockResolvedValueOnce(120).mockResolvedValueOnce(100);
		applicationGroupBy.mockResolvedValue([
			{ eventId: "a", status: "APPLIED", _count: { _all: 30 } },
			{ eventId: "a", status: "ACCEPTED", _count: { _all: 20 } },
		]);
		// Name and start of the program come from the events query.
		const fb = (
			eventId: string,
			_name: string,
			_from: string,
			role: "PARTICIPANT" | "MENTOR",
			overallScore: number | null,
			recommend: string | null,
		) => ({ eventId, role, overallScore, recommend });
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
	});

	const year = (key = "2026") => loadDashboard({ period: key }, now);

	it("defaults to all years without a comparison or period queries", async () => {
		const data = await loadDashboard({}, now);
		expect(data.mode).toBe("year");
		expect(data.year).toBeNull();
		expect(data.range).toBeNull();
		expect(data.comparison).toBeNull();
		expect(data.years).toEqual([2026, 2025]);
		expect(eventFindMany).toHaveBeenCalledTimes(1);
		expect(applicationCount).not.toHaveBeenCalled();
		expect(feedbackFindMany).not.toHaveBeenCalled();
	});

	it("treats an unknown period as all years", async () => {
		const data = await loadDashboard({ period: "1999" }, now);
		expect(data.comparison).toBeNull();
	});

	it("lists every program and the distinct company names in order", async () => {
		const data = await loadDashboard({}, now);
		expect(data.programs.map((p) => p.id)).toEqual(["a", "c", "b", "d"]);
		expect(data.companies).toEqual(["Alfa Zrt.", "Zeta Kft."]);
	});

	it("switches to the program breakdown and drops the year", async () => {
		const data = await loadDashboard({ program: "c", period: "2026" }, now);
		expect(data.mode).toBe("program");
		expect(data.program).toEqual({ id: "c", name: "Tavaszi tábor" });
		expect(data.year).toBeNull();
		expect(data.range).toBeNull();
		expect(data.comparison).toBeNull();
		expect(applicationCount).not.toHaveBeenCalled();
	});

	it("switches to the company breakdown and drops the year", async () => {
		const data = await loadDashboard(
			{ company: "Zeta Kft.", period: "2026" },
			now,
		);
		expect(data.mode).toBe("company");
		expect(data.company).toBe("Zeta Kft.");
		expect(data.program).toBeNull();
		expect(data.year).toBeNull();
		expect(data.comparison).toBeNull();
	});

	it("lets the program win when a company is also given", async () => {
		const data = await loadDashboard(
			{ program: "a", company: "Zeta Kft." },
			now,
		);
		expect(data.mode).toBe("program");
		expect(data.company).toBeNull();
	});

	it("ignores an unknown company or program", async () => {
		const data = await loadDashboard(
			{ company: "Nincs Kft.", program: "x" },
			now,
		);
		expect(data.mode).toBe("year");
		expect(data.company).toBeNull();
		expect(data.program).toBeNull();
	});

	it("counts applications (not distinct applicants), anonymized applicants included", async () => {
		const data = await year();
		expect(applicationCount.mock.calls.map((c) => c[0].where)).toEqual([
			{ receivedAt: range(2026) },
			{ receivedAt: range(2025) },
		]);
		expect(data.comparison?.applications).toEqual({
			current: 120,
			previous: 100,
		});
		expect(data.year).toBe(2026);
		expect(data.comparison?.previousLabel).toBe("2025");
		expect(data.range).toEqual(range(2026));
		expect(data.program).toBeNull();
	});

	it("counts applications of anonymized applicants per event and by status", async () => {
		await year();
		expect(eventFindMany.mock.calls[1][0].select._count).toEqual({
			select: { applications: true },
		});
		// Same events as the events query, in the same database round.
		expect(applicationGroupBy.mock.calls[0][0].where).toEqual({
			event: { from: eventFindMany.mock.calls[1][0].where.from },
		});
		expect(eventFindMany.mock.calls[1][0].where).toEqual({
			from: { gte: range(2025).gte },
		});
	});

	it("compares oversubscription of events starting in each period", async () => {
		const data = await year();
		expect(data.comparison?.oversubscription).toEqual({
			current: 55 / 30,
			previous: 1.5,
		});
	});

	it("shows the events starting in the year in the capacity chart", async () => {
		const data = await year();
		expect(data.comparison?.capacity.map((r) => [r.id, r.state])).toEqual([
			["a", "upcoming"],
			["c", "past"],
		]);
	});

	it("breaks the capacity rows down by application status", async () => {
		const data = await year();
		const rows = data.comparison?.capacity;
		expect(rows?.find((r) => r.id === "a")?.byStatus).toEqual({
			APPLIED: 30,
			ACCEPTED: 20,
		});
		expect(rows?.find((r) => r.id === "c")?.byStatus).toEqual({});
	});

	it("offers years back to the first program in the database", async () => {
		eventAggregate.mockResolvedValue({
			_min: { from: new Date("2024-03-16T08:00:00Z") },
			_max: { from: null },
		});
		const data = await year("2024");
		expect(data.years).toEqual([2026, 2025, 2024]);
		expect(data.year).toBe(2024);
		expect(data.comparison?.previousLabel).toBe("2023");
	});

	it("returns six trend months ending with the current one", async () => {
		const data = await year("2025");
		expect(data.comparison?.trend.map((p) => p.key)).toEqual([
			"2026-06",
			"2026-07",
			"2026-08",
			"2026-09",
			"2026-10",
			"2026-11",
		]);
		expect(data.comparison?.trend[4].ratio).toBe(2.5);
	});

	it("splits satisfaction by role and assigns feedback by program start", async () => {
		const data = await year();
		expect(feedbackFindMany.mock.calls[0][0].where).toEqual({
			event: {
				from: { gte: range(2025).gte, lt: range(2026).lt },
			},
		});
		const { current, previous } = data.comparison!.satisfaction;
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
			data.comparison?.satisfactionByProgram.map((p) => [
				p.id,
				p.participant.average,
				p.mentor.average,
			]),
		).toEqual([
			["a", 4.5, 3],
			["c", null, null],
		]);
	});
});
