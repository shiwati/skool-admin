import "server-only";
import { ApplicationStatus, type Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import {
	ageRangeToBirthYear,
	booleanParam,
	budapestYearRange,
	foldedContains,
	foldSearch,
	csvList,
	optionalText,
	orderSchema,
	pageResult,
	paginationSchema,
	searchTokens,
} from "@/lib/api/query";
import { APPLICANT_SEARCH_OMIT } from "@/lib/search-columns";

/** A `GET /api/applicants` query sémája (az oldal első rendereléséhez is). */
export const applicantsQuerySchema = z
	.object({
		...paginationSchema,
		eventIds: csvList(z.string().min(1)),
		programYear: z.coerce.number().int().min(2000).max(2100).optional(),
		ageFrom: z.coerce.number().int().min(0).optional(),
		ageTo: z.coerce.number().int().min(0).optional(),
		hometown: optionalText,
		newsletter: booleanParam,
		historyFrom: z.coerce.number().int().min(0).optional(),
		historyTo: z.coerce.number().int().min(0).optional(),
		q: optionalText,
		sort: z
			.enum(["lastName", "birthYear", "hometown", "history", "createdAt"])
			.default("lastName"),
		order: orderSchema.default("asc"),
	})
	.refine(
		(v) =>
			v.ageFrom === undefined ||
			v.ageTo === undefined ||
			v.ageFrom <= v.ageTo,
		{ message: "ageFrom must be <= ageTo", path: ["ageFrom"] },
	)
	.refine(
		(v) =>
			v.historyFrom === undefined ||
			v.historyTo === undefined ||
			v.historyFrom <= v.historyTo,
		{ message: "historyFrom must be <= historyTo", path: ["historyFrom"] },
	);

const NULLABLE_SORTS = new Set(["birthYear", "hometown"]);

export type ApplicantsQuery = z.output<typeof applicantsQuerySchema>;

const listInclude = {
	applications: {
		select: {
			id: true,
			status: true,
			receivedAt: true,
			event: { select: { id: true, name: true, from: true } },
		},
		orderBy: { receivedAt: "desc" },
	},
} satisfies Prisma.ApplicantInclude;

/** Jelentkezőnként a „Részt vett” jelentkezések száma (csak a ≥ 1 szerepel). */
async function attendedCounts(): Promise<Map<string, number>> {
	const rows = await db.application.groupBy({
		by: ["applicantId"],
		where: { status: ApplicationStatus.ATTENDED },
		_count: { _all: true },
	});
	return new Map(rows.map((r) => [r.applicantId, r._count._all]));
}

/** Előzmény (elvégzett programok száma) tól–ig → `id` feltétel. */
export function historyFilter(
	counts: Map<string, number>,
	from: number | undefined,
	to: number | undefined,
): Prisma.ApplicantWhereInput {
	const min = from ?? 0;
	const max = to ?? Number.POSITIVE_INFINITY;
	if (min > 0) {
		const ids = [...counts]
			.filter(([, n]) => n >= min && n <= max)
			.map(([id]) => id);
		return { id: { in: ids } };
	}
	// 0-tól: aki nincs a táblában (0 program), az is belefér.
	const tooMany = [...counts].filter(([, n]) => n > max).map(([id]) => id);
	return { id: { notIn: tooMany } };
}

/**
 * Rendezés előzmény szerint: a szám nem DB-oszlop, ezért a szűrt
 * azonosítókat a memóriában rendezzük (a lista mérete korlátos), és csak
 * az aktuális oldalt töltjük be.
 */
async function listByHistory(
	where: Prisma.ApplicantWhereInput,
	counts: Map<string, number>,
	query: ApplicantsQuery,
) {
	const rows = await db.applicant.findMany({
		where,
		select: { id: true, lastName: true, firstName: true },
	});
	const dir = query.order === "asc" ? 1 : -1;
	rows.sort(
		(a, b) =>
			dir * ((counts.get(a.id) ?? 0) - (counts.get(b.id) ?? 0)) ||
			a.lastName.localeCompare(b.lastName, "hu") ||
			a.firstName.localeCompare(b.firstName, "hu") ||
			a.id.localeCompare(b.id),
	);
	const start = (query.page - 1) * query.pageSize;
	const pageIds = rows.slice(start, start + query.pageSize).map((r) => r.id);
	const found = await db.applicant.findMany({
		where: { id: { in: pageIds } },
		omit: APPLICANT_SEARCH_OMIT,
		include: listInclude,
	});
	const byId = new Map(found.map((a) => [a.id, a]));
	const items = pageIds.flatMap((id) => byId.get(id) ?? []);
	return pageResult(items, rows.length, query.page, query.pageSize);
}

/** Egy oldalnyi jelentkező a szűrők szerint; törölt (anonimizált) soha. */
export async function listApplicants(query: ApplicantsQuery) {
	// Anonimizált (GDPR-törölt) jelentkezők soha nem jelennek meg a listában.
	const and: Prisma.ApplicantWhereInput[] = [{ deletedAt: null }];

	if (query.eventIds) {
		and.push({
			applications: { some: { eventId: { in: query.eventIds } } },
		});
	}
	if (query.programYear !== undefined) {
		and.push({
			applications: {
				some: { event: { from: budapestYearRange(query.programYear) } },
			},
		});
	}
	const birthYear = ageRangeToBirthYear(query.ageFrom, query.ageTo);
	if (birthYear) and.push({ birthYear });
	// Text filters ignore case and accents: folded like the search columns.
	const words = searchTokens(query.q);
	const folded = await foldSearch(
		db,
		query.hometown ? [query.hometown, ...words] : words,
	);
	if (query.hometown)
		and.push({ hometownSearch: foldedContains(folded.shift()!) });
	if (query.newsletter !== undefined)
		and.push({ newsletter: query.newsletter });
	const hasHistoryFilter =
		query.historyFrom !== undefined || query.historyTo !== undefined;
	const attended =
		hasHistoryFilter || query.sort === "history"
			? await attendedCounts()
			: undefined;
	if (attended && hasHistoryFilter) {
		and.push(historyFilter(attended, query.historyFrom, query.historyTo));
	}
	// Every word must appear in the name or the e-mail (`search_text`).
	for (const word of folded) {
		and.push({ searchText: foldedContains(word) });
	}

	const where: Prisma.ApplicantWhereInput = { AND: and };
	if (query.sort === "history") {
		return listByHistory(where, attended ?? new Map(), query);
	}
	const orderBy: Prisma.ApplicantOrderByWithRelationInput[] = [
		// Prisma accepts `nulls` only on nullable columns (birthYear,
		// hometown); lastName and createdAt are required.
		NULLABLE_SORTS.has(query.sort)
			? { [query.sort]: { sort: query.order, nulls: "last" } }
			: { [query.sort]: query.order },
		...(query.sort === "lastName" ? [{ firstName: query.order }] : []),
		{ id: "asc" },
	];

	const [items, total] = await Promise.all([
		db.applicant.findMany({
			where,
			orderBy,
			skip: (query.page - 1) * query.pageSize,
			take: query.pageSize,
			omit: APPLICANT_SEARCH_OMIT,
			include: listInclude,
		}),
		db.applicant.count({ where }),
	]);

	return pageResult(items, total, query.page, query.pageSize);
}
