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

export type DashboardData = {
	/** A kiválasztott év; `null` = összes év. */
	year: number | null;
	/** A választható évek, a legfrissebb elöl. */
	years: number[];
	/** A kiválasztott év időkerete; `null` = összes év. */
	range: DateRange | null;
	/** A kiválasztott évben induló programok (az összes évnél mind): a programszűrő listája. */
	programs: ProgramOption[];
	/** A kiválasztott program, vagy `null` = összes program. */
	program: ProgramOption | null;
	/** Csak év kiválasztva, program nélkül; egyébként `null`. */
	comparison: PeriodComparison | null;
};

export type DashboardFilters = { period?: string; program?: string };

/** Anonimizált (GDPR-törölt) jelentkező nem számít bele egyik mutatóba sem. */
const activeApplicant = { applicant: { deletedAt: null } };

const within = (range: DateRange, date: Date) =>
	date >= range.gte && date < range.lt;

export async function loadDashboard(
	filters: DashboardFilters = {},
	now = new Date(),
): Promise<DashboardData> {
	const firstYear = await firstEventYear();
	const period = resolvePeriod(filters.period, now, firstYear);

	const programs = await db.event.findMany({
		where: period ? { from: period.range } : {},
		select: { id: true, name: true },
		orderBy: [{ from: "desc" }, { id: "asc" }],
	});
	const program = programs.find((p) => p.id === filters.program) ?? null;

	const base = {
		year: period?.year ?? null,
		years: periodYears(now, firstYear),
		range: period?.range ?? null,
		programs,
		program,
	};
	if (!period || program) return { ...base, comparison: null };

	const applicationsIn = (range: DateRange) =>
		db.application.count({
			where: { ...activeApplicant, receivedAt: range },
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
				_count: {
					select: { applications: { where: activeApplicant } },
				},
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
				where: {
					...activeApplicant,
					eventId: { in: rawEvents.map((e) => e.id) },
				},
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
