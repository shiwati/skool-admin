import "server-only";
import { ApplicationStatus, type Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import {
	ageRangeToBirthYear,
	containsInsensitive,
	csvList,
	optionalText,
	orderSchema,
	pageResult,
	paginationSchema,
	searchParamsToObject,
	searchTokens,
} from "@/lib/api/query";
import type { InitialApplications } from "./applications";
import {
	toApplicationsApiQuery,
	type ApplicationsView,
} from "./applications-params";

/** A `GET /api/events/[id]/applicants` query sémája. */
export const eventApplicationsQuerySchema = z
	.object({
		...paginationSchema,
		status: csvList(z.enum(ApplicationStatus)),
		ageFrom: z.coerce.number().int().min(0).optional(),
		ageTo: z.coerce.number().int().min(0).optional(),
		q: optionalText,
		sort: z
			.enum(["lastName", "birthYear", "status", "receivedAt"])
			.default("receivedAt"),
		order: orderSchema.default("asc"),
	})
	.refine(
		(v) =>
			v.ageFrom === undefined ||
			v.ageTo === undefined ||
			v.ageFrom <= v.ageTo,
		{ message: "ageFrom must be <= ageTo", path: ["ageFrom"] },
	);

export type EventApplicationsApiQuery = z.output<
	typeof eventApplicationsQuerySchema
>;

/**
 * Egy program jelentkezéseinek egy oldala, a törölt (anonimizált)
 * jelentkezők nélkül. Az esemény létezését a hívó ellenőrzi.
 */
export async function listEventApplications(
	eventId: string,
	query: EventApplicationsApiQuery,
) {
	const applicant: Prisma.ApplicantWhereInput[] = [];
	const birthYear = ageRangeToBirthYear(query.ageFrom, query.ageTo);
	if (birthYear) applicant.push({ birthYear });
	for (const token of searchTokens(query.q)) {
		applicant.push({
			OR: [
				{ firstName: containsInsensitive(token) },
				{ lastName: containsInsensitive(token) },
				{ email: containsInsensitive(token) },
			],
		});
	}

	const where: Prisma.ApplicationWhereInput = {
		eventId,
		...(query.status && { status: { in: query.status } }),
		applicant: {
			deletedAt: null,
			...(applicant.length && { AND: applicant }),
		},
	};

	const sortMap: Record<
		typeof query.sort,
		Prisma.ApplicationOrderByWithRelationInput[]
	> = {
		lastName: [
			{ applicant: { lastName: query.order } },
			{ applicant: { firstName: query.order } },
		],
		birthYear: [
			{
				applicant: {
					birthYear: { sort: query.order, nulls: "last" },
				},
			},
		],
		status: [{ status: query.order }],
		receivedAt: [{ receivedAt: query.order }],
	};

	const [items, total] = await Promise.all([
		db.application.findMany({
			where,
			orderBy: [...sortMap[query.sort], { id: "asc" }],
			skip: (query.page - 1) * query.pageSize,
			take: query.pageSize,
			include: { applicant: true },
		}),
		db.application.count({ where }),
	]);

	return pageResult(items, total, query.page, query.pageSize);
}

/**
 * A Jelentkezők fül egy nézetének oldala a szerveren, ugyanazzal az
 * API-query-vel, amit a kliens kérne. Csak a táblához kellő mezőket adja
 * tovább (a szülői adatok nem kerülnek a kliensnek küldött payloadba),
 * dátumokat ISO szövegként, mint az API.
 */
export async function loadEventApplicationsPage(
	eventId: string,
	view: ApplicationsView,
): Promise<InitialApplications> {
	const apiQuery = toApplicationsApiQuery(view);
	const parsed = eventApplicationsQuerySchema.parse(
		searchParamsToObject(apiQuery),
	);
	const page = await listEventApplications(eventId, parsed);
	const data = {
		...page,
		items: page.items.map(({ id, status, receivedAt, applicant: a }) => ({
			id,
			status,
			receivedAt: receivedAt.toISOString(),
			applicant: {
				id: a.id,
				firstName: a.firstName,
				lastName: a.lastName,
				email: a.email,
				birthYear: a.birthYear,
				hometown: a.hometown,
				schoolName: a.schoolName,
				duplicateFlag: a.duplicateFlag,
				newsletter: a.newsletter,
			},
		})),
	};
	return { apiQuery: apiQuery.toString(), data };
}
