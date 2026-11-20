import { ApplicationStatus, type Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { handleQuery, jsonResponse } from "@/lib/api/handler";
import {
	ageRangeToBirthYear,
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

export async function GET(
	request: Request,
	{ params }: RouteContext<"/api/events/[id]/applicants">,
) {
	const { id } = await params;

	return handleQuery(request, querySchema, async (query) => {
		const event = await db.event.findUnique({
			where: { id },
			select: { id: true },
		});
		if (!event) return jsonResponse({ error: "Event not found" }, 404);

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
			eventId: id,
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

		return jsonResponse(
			pageResult(items, total, query.page, query.pageSize),
		);
	});
}
