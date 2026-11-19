import { ApplicationStatus, type Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { handleQuery, jsonResponse } from "@/lib/api/handler";
import {
	ageRangeToBirthYear,
	booleanParam,
	containsInsensitive,
	csvList,
	optionalText,
	orderSchema,
	pageResult,
	paginationSchema,
	searchTokens,
} from "@/lib/api/query";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z
	.object({
		...paginationSchema,
		eventIds: csvList(z.string().min(1)),
		ageFrom: z.coerce.number().int().min(0).optional(),
		ageTo: z.coerce.number().int().min(0).optional(),
		hometown: optionalText,
		newsletter: booleanParam,
		attended: booleanParam,
		q: optionalText,
		sort: z
			.enum(["lastName", "birthYear", "hometown", "createdAt"])
			.default("lastName"),
		order: orderSchema.default("asc"),
	})
	.refine(
		(v) =>
			v.ageFrom === undefined ||
			v.ageTo === undefined ||
			v.ageFrom <= v.ageTo,
		{ message: "ageFrom must be <= ageTo", path: ["ageFrom"] },
	);

const NULLABLE_SORTS = new Set(["birthYear", "hometown"]);

export async function GET(request: Request) {
	return handleQuery(request, querySchema, async (query) => {
		// Anonimizált (GDPR-törölt) jelentkezők soha nem jelennek meg a listában.
		const and: Prisma.ApplicantWhereInput[] = [{ deletedAt: null }];

		if (query.eventIds) {
			and.push({
				applications: { some: { eventId: { in: query.eventIds } } },
			});
		}
		const birthYear = ageRangeToBirthYear(query.ageFrom, query.ageTo);
		if (birthYear) and.push({ birthYear });
		if (query.hometown)
			and.push({ hometown: containsInsensitive(query.hometown) });
		if (query.newsletter !== undefined)
			and.push({ newsletter: query.newsletter });
		if (query.attended !== undefined) {
			const attendedFilter = {
				applications: { some: { status: ApplicationStatus.ATTENDED } },
			};
			and.push(query.attended ? attendedFilter : { NOT: attendedFilter });
		}
		for (const token of searchTokens(query.q)) {
			and.push({
				OR: [
					{ firstName: containsInsensitive(token) },
					{ lastName: containsInsensitive(token) },
					{ email: containsInsensitive(token) },
				],
			});
		}

		const where: Prisma.ApplicantWhereInput = { AND: and };
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
				include: {
					applications: {
						select: {
							id: true,
							status: true,
							receivedAt: true,
							event: {
								select: { id: true, name: true, from: true },
							},
						},
						orderBy: { receivedAt: "desc" },
					},
				},
			}),
			db.applicant.count({ where }),
		]);

		return jsonResponse(
			pageResult(items, total, query.page, query.pageSize),
		);
	});
}
