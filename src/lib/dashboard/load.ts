import "server-only";
import { db } from "@/lib/db";
import {
	capacityRows,
	lastMonthsStart,
	monthlyOversubscription,
	oversubscription,
	programSatisfaction,
	satisfactionByRole,
	type CapacityRow,
	type EventStat,
	type FeedbackStat,
	type MonthlyRatio,
	type ProgramSatisfaction,
	type Satisfaction,
	type StatusBreakdown,
} from "./compute";
import { firstEventYear } from "./first-year";
import { periodYears, resolvePeriod, type DateRange } from "./period";

export const TREND_MONTHS = 6;

export type ProgramOption = { id: string; name: string };

/** Egy év összevetése az előzővel; csak év kiválasztásakor készül. */
export type PeriodComparison = {
	previousLabel: string;
	/** Beérkezett jelentkezések száma: két program = két jelentkezés. */
	applications: { current: number; previous: number };
	oversubscription: { current: number | null; previous: number | null };
	capacity: CapacityRow[];
	trend: MonthlyRatio[];
	/** Visszajelzések a program kezdete szerint az időszakhoz rendelve. */
	satisfaction: { current: Satisfaction; previous: Satisfaction };
	satisfactionByProgram: ProgramSatisfaction[];
};

/** Az áttekintés bontása: egyszerre csak egy aktív. */
export type DashboardMode = "year" | "program" | "company";

export type DashboardData = {
	mode: DashboardMode;
	/** A kiválasztott év; `null` = összes év (vagy nem éves bontás). */
	year: number | null;
	/** A választható évek, a legfrissebb elöl. */
	years: number[];
	/** A kiválasztott év időkerete; `null` = összes év (vagy nem éves bontás). */
	range: DateRange | null;
	/** Az összes program, a legfrissebb elöl: a programszűrő listája. */
	programs: ProgramOption[];
	/** A kiválasztott program (csak programbontásnál). */
	program: ProgramOption | null;
	/** Az összes cégnév ábécé szerint: a cégszűrő listája. */
	companies: string[];
	/** A kiválasztott cég (csak cégbontásnál). */
	company: string | null;
	/** Csak év kiválasztva; egyébként `null`. */
	comparison: PeriodComparison | null;
};

export type DashboardFilters = {
	period?: string;
	program?: string;
	company?: string;
};

const within = (range: DateRange, date: Date) =>
	date >= range.gte && date < range.lt;

/**
 * Az anonimizált (GDPR-törölt) jelentkezők jelentkezései minden mutatóba
 * beleszámítanak: az anonimizálás épp a statisztikák megőrzéséért nem töröl.
 * Szűrés `deletedAt`-re csak személyeket listázó lekérdezésben kell.
 */
export async function loadDashboard(
	filters: DashboardFilters = {},
	now = new Date(),
): Promise<DashboardData> {
	const firstYear = await firstEventYear();

	const allEvents = await db.event.findMany({
		select: { id: true, name: true, companyName: true },
		orderBy: [{ from: "desc" }, { id: "asc" }],
	});
	const programs = allEvents.map(({ id, name }) => ({ id, name }));
	const companyNames = new Set<string>();
	for (const e of allEvents) {
		if (e.companyName?.trim()) companyNames.add(e.companyName);
	}
	const companies = [...companyNames].sort((a, b) =>
		a.localeCompare(b, "hu"),
	);

	// A három szűrő kölcsönösen kizárja egymást: program > cég > év.
	const program = programs.find((p) => p.id === filters.program) ?? null;
	const company = program
		? null
		: (companies.find((c) => c === filters.company) ?? null);
	const mode: DashboardMode = program
		? "program"
		: company
			? "company"
			: "year";
	const period =
		mode === "year" ? resolvePeriod(filters.period, now, firstYear) : null;

	const base = {
		mode,
		year: period?.year ?? null,
		years: periodYears(now, firstYear),
		range: period?.range ?? null,
		programs,
		program,
		companies,
		company,
	};
	if (!period) return { ...base, comparison: null };

	const applicationsIn = (range: DateRange) =>
		db.application.count({
			where: { receivedAt: range },
		});

	// Az összevetett időszak elejétől (KPI) vagy a trend kezdetétől induló
	// programok, ami korábbi.
	const trendStart = lastMonthsStart(now, TREND_MONTHS);

	const [current, previous, rawEvents, feedbackRows] = await Promise.all([
		applicationsIn(period.range),
		applicationsIn(period.previous),
		db.event.findMany({
			where: {
				from: {
					gte:
						trendStart < period.previous.gte
							? trendStart
							: period.previous.gte,
				},
			},
			select: {
				id: true,
				name: true,
				from: true,
				to: true,
				capacity: true,
				_count: { select: { applications: true } },
			},
		}),
		db.feedback.findMany({
			where: {
				event: {
					from: { gte: period.previous.gte, lt: period.range.lt },
				},
			},
			select: {
				eventId: true,
				role: true,
				overallScore: true,
				recommend: true,
				event: { select: { name: true, from: true } },
			},
		}),
	]);

	const statusRows = rawEvents.length
		? await db.application.groupBy({
				by: ["eventId", "status"],
				where: { eventId: { in: rawEvents.map((e) => e.id) } },
				_count: { _all: true },
			})
		: [];
	const byStatusByEvent = new Map<string, StatusBreakdown>();
	for (const row of statusRows) {
		const breakdown = byStatusByEvent.get(row.eventId) ?? {};
		breakdown[row.status] = row._count._all;
		byStatusByEvent.set(row.eventId, breakdown);
	}

	const events: EventStat[] = rawEvents.map((e) => ({
		id: e.id,
		name: e.name,
		from: e.from,
		to: e.to,
		capacity: e.capacity,
		applications: e._count.applications,
		byStatus: byStatusByEvent.get(e.id) ?? {},
	}));
	const startsIn = (range: DateRange) =>
		events.filter((e) => within(range, e.from));

	const feedback: FeedbackStat[] = feedbackRows.map((f) => ({
		eventId: f.eventId,
		eventName: f.event.name,
		eventFrom: f.event.from,
		role: f.role,
		overallScore: f.overallScore,
		recommend: f.recommend,
	}));
	const feedbackIn = (range: DateRange) =>
		feedback.filter((f) => within(range, f.eventFrom));

	return {
		...base,
		comparison: {
			previousLabel: String(period.year - 1),
			applications: { current, previous },
			oversubscription: {
				current: oversubscription(startsIn(period.range)),
				previous: oversubscription(startsIn(period.previous)),
			},
			capacity: capacityRows(startsIn(period.range), now),
			trend: monthlyOversubscription(events, now, TREND_MONTHS),
			satisfaction: {
				current: satisfactionByRole(feedbackIn(period.range)),
				previous: satisfactionByRole(feedbackIn(period.previous)),
			},
			satisfactionByProgram: programSatisfaction(
				feedbackIn(period.range),
			),
		},
	};
}
