import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
	ageAtEvent,
	ageDistribution,
	capacityRows,
	hometownDistribution,
	lastMonthsStart,
	monthlyOversubscription,
	oversubscription,
	programSatisfaction,
	satisfactionByRole,
	type CapacityRow,
	type CountRow,
	type EventStat,
	type FeedbackStat,
	type MonthlyRatio,
	type ProgramSatisfaction,
	type Satisfaction,
	type StatusBreakdown,
} from "./compute";
import { firstEventYear } from "./first-year";
import {
	periodOptions,
	resolvePeriod,
	type DateRange,
	type PeriodOption,
} from "./period";

export const TREND_MONTHS = 6;

export type Demographics = {
	/** Jelentkezések száma: aki két programra jelentkezett, kétszer számít. */
	total: number;
	age: CountRow[];
	hometown: CountRow[];
};

export type ProgramOption = { id: string; name: string };

export type DashboardData = {
	period: PeriodOption & { previousLabel: string };
	periodOptions: PeriodOption[];
	/** A kiválasztott időszakban induló programok (a programszűrő listája). */
	programs: ProgramOption[];
	/** A kiválasztott program, vagy `null` = összes program. */
	program: ProgramOption | null;
	/** Beérkezett jelentkezések száma: két program = két jelentkezés. */
	applications: { current: number; previous: number };
	oversubscription: { current: number | null; previous: number | null };
	capacity: CapacityRow[];
	trend: MonthlyRatio[];
	demographics: Demographics;
	/** Visszajelzések a program kezdete szerint az időszakhoz rendelve. */
	satisfaction: { current: Satisfaction; previous: Satisfaction };
	satisfactionByProgram: ProgramSatisfaction[];
};

export type DashboardFilters = { period?: string; program?: string };

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
	const period = resolvePeriod(filters.period, now, firstYear);

	const programs = await db.event.findMany({
		where: { from: period.range },
		select: { id: true, name: true },
		orderBy: [{ from: "desc" }, { id: "asc" }],
	});
	const program = programs.find((p) => p.id === filters.program) ?? null;
	const programWhere = program ? { eventId: program.id } : {};

	const applicationsIn = (range: DateRange) =>
		db.application.count({
			where: { ...programWhere, receivedAt: range },
		});

	// Az összevetett időszak elejétől (KPI) vagy a trend kezdetétől induló
	// programok, ami korábbi.
	const trendStart = lastMonthsStart(now, TREND_MONTHS);
	const eventsWhere: Prisma.EventWhereInput = {
		from: {
			gte:
				trendStart < period.previous.gte
					? trendStart
					: period.previous.gte,
		},
		...(program && { id: program.id }),
	};

	const [current, previous, rawEvents, demographicRows, feedbackRows] =
		await Promise.all([
			applicationsIn(period.range),
			applicationsIn(period.previous),
			db.event.findMany({
				where: eventsWhere,
				select: {
					id: true,
					name: true,
					from: true,
					to: true,
					capacity: true,
					_count: { select: { applications: true } },
				},
			}),
			db.application.findMany({
				where: { ...programWhere, event: { from: period.range } },
				select: {
					event: { select: { from: true } },
					applicant: { select: { birthYear: true, hometown: true } },
				},
			}),
			db.feedback.findMany({
				where: {
					...programWhere,
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
		period: {
			key: period.key,
			label: period.label,
			previousLabel: period.previousLabel,
		},
		periodOptions: periodOptions(now, firstYear),
		programs,
		program,
		applications: { current, previous },
		oversubscription: {
			current: oversubscription(startsIn(period.range)),
			previous: oversubscription(startsIn(period.previous)),
		},
		capacity: capacityRows(startsIn(period.range), now),
		trend: monthlyOversubscription(events, now, TREND_MONTHS),
		demographics: {
			total: demographicRows.length,
			age: ageDistribution(
				demographicRows.map((r) =>
					ageAtEvent(r.applicant.birthYear, r.event.from),
				),
			),
			hometown: hometownDistribution(
				demographicRows.map((r) => r.applicant.hometown),
			),
		},
		satisfaction: {
			current: satisfactionByRole(feedbackIn(period.range)),
			previous: satisfactionByRole(feedbackIn(period.previous)),
		},
		satisfactionByProgram: programSatisfaction(feedbackIn(period.range)),
	};
}
