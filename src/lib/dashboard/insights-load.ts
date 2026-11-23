import "server-only";
import { db } from "@/lib/db";
import {
	ageAtEvent,
	ageDistribution,
	hometownDistribution,
	orderByCount,
	satisfactionByRole,
	type StatusBreakdown,
} from "./compute";
import {
	ageFit,
	companyDetail,
	companyRanking,
	feedbackCompletion,
	funnel,
	overviewStats,
	parseAgeRange,
	type CompanyDetail,
	type Overview,
	type ProgramDetail,
} from "./insights";
import type { DateRange } from "./period";

/**
 * Összesítés: programok, diákok, cégek, megoszlások. `range` = egy év
 * (az abban induló programok); `null` = összes év.
 *
 * Minden lekérdezés lapos és párhuzamos (egy adatbázis-kör): a jelentkezők,
 * jelentkezéseik és a programok kezdete külön jön, és itt kapcsolódik össze —
 * a beágyazott Prisma-select relációnként egy-egy újabb kört jelentene.
 */
export async function loadOverview(
	range: DateRange | null = null,
): Promise<Overview> {
	const scope = range
		? { applications: { some: { event: { from: range } } } }
		: {};
	const [
		applicants,
		events,
		feedbackRows,
		applications,
		eventStarts,
		attendedRows,
		responseRows,
	] = await Promise.all([
		db.applicant.findMany({
			where: scope,
			select: {
				id: true,
				birthYear: true,
				hometown: true,
				newsletter: true,
			},
		}),
		db.event.findMany({
			where: range ? { from: range } : {},
			select: {
				companyName: true,
				id: true,
				mentors: true,
				_count: { select: { applications: true } },
			},
		}),
		db.feedback.findMany({
			where: range ? { event: { from: range } } : {},
			select: { role: true, overallScore: true, recommend: true },
		}),
		// A hatókör jelentkezőinek összes jelentkezése (a visszatérőkhöz a
		// korábbi évekéi is kellenek).
		db.application.findMany({
			where: range ? { applicant: scope } : {},
			select: { applicantId: true, eventId: true, heardFromWhere: true },
		}),
		db.event.findMany({ select: { id: true, from: true } }),
		range
			? db.application.groupBy({
					by: ["eventId"],
					where: {
						status: "ATTENDED",
						event: { from: range },
					},
					_count: { _all: true },
				})
			: null,
		range
			? db.feedback.groupBy({
					by: ["eventId", "role"],
					where: { event: { from: range } },
					_count: { _all: true },
				})
			: null,
	]);

	const startOf = new Map(eventStarts.map((e) => [e.id, e.from]));
	const applicationsOf = new Map<
		string,
		{ eventId: string; eventFrom: Date; heardFromWhere: string | null }[]
	>();
	for (const a of applications) {
		const eventFrom = startOf.get(a.eventId);
		if (!eventFrom) continue;
		const list = applicationsOf.get(a.applicantId) ?? [];
		list.push({
			eventId: a.eventId,
			eventFrom,
			heardFromWhere: a.heardFromWhere,
		});
		applicationsOf.set(a.applicantId, list);
	}

	const stats = overviewStats(
		applicants.map((a) => ({
			birthYear: a.birthYear,
			hometown: a.hometown,
			newsletter: a.newsletter,
			applications: applicationsOf.get(a.id) ?? [],
		})),
		range,
	);
	const companies = companyRanking(
		events.map((e) => ({
			companyName: e.companyName,
			applications: e._count.applications,
		})),
	);

	return {
		programs: events.length,
		students: stats.students,
		newsletter: stats.newsletter,
		companies,
		completion:
			attendedRows && responseRows
				? feedbackCompletion(
						events,
						new Map(
							attendedRows.map((r) => [r.eventId, r._count._all]),
						),
						responseRows.map((r) => ({
							eventId: r.eventId,
							role: r.role,
							count: r._count._all,
						})),
					)
				: null,
		returning: stats.returning,
		demographics: stats.demographics,
		channels: stats.channels,
		satisfaction: satisfactionByRole(feedbackRows),
	};
}

/** Egy cég (`Event.companyName`) mutatói a programjai alapján. */
export async function loadCompanyDetail(
	company: string,
): Promise<CompanyDetail> {
	const [events, students, feedback] = await Promise.all([
		db.event.findMany({
			where: { companyName: company },
			select: {
				id: true,
				name: true,
				from: true,
				to: true,
				capacity: true,
				mentors: true,
				_count: { select: { applications: true } },
			},
		}),
		db.application.findMany({
			where: { event: { companyName: company } },
			select: { applicantId: true },
			distinct: ["applicantId"],
		}),
		db.feedback.findMany({
			where: { event: { companyName: company } },
			select: {
				eventId: true,
				role: true,
				overallScore: true,
				recommend: true,
			},
		}),
	]);

	return companyDetail(
		company,
		events.map((e) => ({
			id: e.id,
			name: e.name,
			from: e.from,
			to: e.to,
			capacity: e.capacity,
			mentors: e.mentors,
			applications: e._count.applications,
		})),
		students.length,
		feedback,
	);
}

/** Egy program részletes mutatói; `null`, ha nincs ilyen program. */
export async function loadProgramDetail(
	eventId: string,
	now = new Date(),
): Promise<ProgramDetail | null> {
	const [event, applications, feedbackRows] = await Promise.all([
		db.event.findUnique({
			where: { id: eventId },
			select: {
				id: true,
				name: true,
				from: true,
				to: true,
				capacity: true,
				ageRange: true,
				mentors: true,
			},
		}),
		db.application.findMany({
			where: { eventId },
			select: {
				status: true,
				heardFromWhere: true,
				applicantId: true,
				applicant: { select: { birthYear: true, hometown: true } },
			},
		}),
		db.feedback.findMany({
			where: { eventId },
			select: { role: true, overallScore: true, recommend: true },
		}),
	]);
	if (!event) return null;

	const applicantIds = [...new Set(applications.map((a) => a.applicantId))];
	const earlier = applicantIds.length
		? await db.application.findMany({
				where: {
					applicantId: { in: applicantIds },
					eventId: { not: eventId },
					event: { from: { lt: event.from } },
				},
				select: { applicantId: true },
				distinct: ["applicantId"],
			})
		: [];

	const byStatus: StatusBreakdown = {};
	for (const a of applications) {
		byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
	}
	const steps = funnel(byStatus);

	const ages = applications.map((a) =>
		ageAtEvent(a.applicant.birthYear, event.from),
	);
	const range = parseAgeRange(event.ageRange);

	const satisfaction = satisfactionByRole(feedbackRows);
	const mentorCount = event.mentors.filter((m) => m.trim()).length;

	return {
		id: event.id,
		name: event.name,
		capacity: event.capacity,
		finished: event.to < now,
		funnel: steps,
		oversubscription:
			event.capacity > 0 ? applications.length / event.capacity : null,
		returning: { returning: earlier.length, total: applicantIds.length },
		demographics: {
			total: applications.length,
			age: ageDistribution(ages),
			hometown: hometownDistribution(
				applications.map((a) => a.applicant.hometown),
			),
		},
		ageFit: range ? ageFit(ages, range) : null,
		channels: orderByCount(
			hometownDistribution(applications.map((a) => a.heardFromWhere)),
		),
		satisfaction,
		completion: {
			participants: {
				responses: satisfaction.PARTICIPANT.responses,
				expected: steps.attended > 0 ? steps.attended : null,
			},
			mentors: {
				responses: satisfaction.MENTOR.responses,
				expected: mentorCount > 0 ? mentorCount : null,
			},
		},
	};
}
