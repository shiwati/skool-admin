import "server-only";
import { ApplicationStatus, type Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import {
	budapestYearRange,
	containsInsensitive,
	optionalText,
	orderSchema,
	pageResult,
	paginationSchema,
	repeatedList,
	searchTokens,
} from "@/lib/api/query";
import { EVENT_PHASES, type EventPhase } from "./phase";
import { tagSchema } from "./tags";

/** A `GET /api/events` query sémája (a `/events` oldal is ezt használja). */
export const eventsQuerySchema = z.object({
	...paginationSchema,
	year: z.coerce.number().int().min(2000).max(2100).optional(),
	companyName: optionalText,
	/** Helyszín vagy partnercég (bármelyikben egyezzen). */
	place: optionalText,
	instructor: optionalText,
	q: optionalText,
	/** Ismételt paraméter, érvényes (normalizált) címkék; legalább egy egyezzen. */
	tags: repeatedList(tagSchema),
	/** Életciklus-szakasz (lásd `phase.ts`); hiányzik = mind. */
	phase: z.enum(EVENT_PHASES).optional(),
	sort: z.enum(["from", "name", "companyName", "capacity"]).default("from"),
	order: orderSchema.optional(),
});

export type EventsQuery = z.output<typeof eventsQuerySchema>;

export type StatusCounts = Record<ApplicationStatus, number> & {
	total: number;
};

export function emptyCounts(): StatusCounts {
	const counts = { total: 0 } as StatusCounts;
	for (const status of Object.values(ApplicationStatus)) counts[status] = 0;
	return counts;
}

/**
 * Szakasz → feltétel. Tervezett: még nem ért véget; Lezárt: véget ért.
 */
export function phaseWhere(
	phase: EventPhase,
	now: Date,
): Prisma.EventWhereInput {
	switch (phase) {
		case "planned":
			return { to: { gte: now } };
		case "closed":
			return { to: { lt: now } };
	}
}

/** A szakasz nélküli szűrőfeltételek (a fülek darabszámaihoz is). */
function filterConditions(query: EventsQuery): Prisma.EventWhereInput[] {
	const and: Prisma.EventWhereInput[] = [];
	if (query.year !== undefined)
		and.push({ from: budapestYearRange(query.year) });
	if (query.companyName) {
		and.push({ companyName: containsInsensitive(query.companyName) });
	}
	if (query.place) {
		and.push({
			OR: [
				{ location: containsInsensitive(query.place) },
				{ companyName: containsInsensitive(query.place) },
			],
		});
	}
	if (query.instructor) {
		and.push({ instructor: containsInsensitive(query.instructor) });
	}
	if (query.tags) and.push({ tags: { hasSome: query.tags } });
	for (const token of searchTokens(query.q)) {
		and.push({ name: containsInsensitive(token) });
	}
	return and;
}

/** Egy oldalnyi esemény, jelentkezésszámokkal státuszonként. */
export async function listEvents(query: EventsQuery, now = new Date()) {
	const and = filterConditions(query);
	if (query.phase) and.push(phaseWhere(query.phase, now));

	const where: Prisma.EventWhereInput = { AND: and };
	const order = query.order ?? (query.sort === "from" ? "desc" : "asc");
	const orderBy: Prisma.EventOrderByWithRelationInput[] = [
		query.sort === "companyName"
			? { companyName: { sort: order, nulls: "last" } }
			: { [query.sort]: order },
		{ id: "asc" },
	];

	const [events, total] = await Promise.all([
		db.event.findMany({
			where,
			orderBy,
			skip: (query.page - 1) * query.pageSize,
			take: query.pageSize,
		}),
		db.event.count({ where }),
	]);

	const grouped = events.length
		? await db.application.groupBy({
				by: ["eventId", "status"],
				where: { eventId: { in: events.map((e) => e.id) } },
				_count: { _all: true },
			})
		: [];

	const countsByEvent = new Map<string, StatusCounts>();
	for (const row of grouped) {
		const counts = countsByEvent.get(row.eventId) ?? emptyCounts();
		counts[row.status] = row._count._all;
		counts.total += row._count._all;
		countsByEvent.set(row.eventId, counts);
	}

	const items = events.map((event) => ({
		...event,
		applicationCounts: countsByEvent.get(event.id) ?? emptyCounts(),
	}));

	return pageResult(items, total, query.page, query.pageSize);
}

export type PhaseCounts = Record<EventPhase | "all", number>;

/** Darabszám szakaszonként, a többi szűrő figyelembevételével (fülekhez). */
export async function countEventsByPhase(
	query: EventsQuery,
	now = new Date(),
): Promise<PhaseCounts> {
	const base = filterConditions(query);
	const [planned, closed] = await Promise.all(
		EVENT_PHASES.map((phase) =>
			db.event.count({
				where: { AND: [...base, phaseWhere(phase, now)] },
			}),
		),
	);
	return { planned, closed, all: planned + closed };
}
