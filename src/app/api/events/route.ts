import { ApplicationStatus, type Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { handleQuery, jsonResponse } from "@/lib/api/handler";
import { logger } from "@/lib/logger";
import { getAdminSession } from "@/lib/session";
import { formatValidationErrors } from "@/lib/validation";
import {
	budapestYearRange,
	containsInsensitive,
	optionalText,
	orderSchema,
	pageResult,
	paginationSchema,
	searchTokens,
} from "@/lib/api/query";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
	...paginationSchema,
	year: z.coerce.number().int().min(2000).max(2100).optional(),
	companyName: optionalText,
	instructor: optionalText,
	q: optionalText,
	sort: z.enum(["from", "name", "companyName", "capacity"]).default("from"),
	order: orderSchema.optional(),
});

type StatusCounts = Record<ApplicationStatus, number> & { total: number };

function emptyCounts(): StatusCounts {
	const counts = { total: 0 } as StatusCounts;
	for (const status of Object.values(ApplicationStatus)) counts[status] = 0;
	return counts;
}

export async function GET(request: Request) {
	return handleQuery(request, querySchema, async (query) => {
		const and: Prisma.EventWhereInput[] = [];

		if (query.year !== undefined)
			and.push({ from: budapestYearRange(query.year) });
		if (query.companyName) {
			and.push({ companyName: containsInsensitive(query.companyName) });
		}
		if (query.instructor) {
			and.push({ instructor: containsInsensitive(query.instructor) });
		}
		for (const token of searchTokens(query.q)) {
			and.push({ name: containsInsensitive(token) });
		}

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

		return jsonResponse(
			pageResult(items, total, query.page, query.pageSize),
		);
	});
}

const optionalField = z
	.string()
	.trim()
	.transform((v) => v || null)
	.nullish();

const createEventSchema = z
	.object({
		name: z.string().trim().min(1),
		from: z.coerce.date(),
		to: z.coerce.date(),
		companyName: optionalField,
		location: optionalField,
		description: optionalField,
		sheetUrl: z.url().nullish(),
		ageRange: optionalField,
		instructor: optionalField,
		mentors: z.array(z.string().trim().min(1)).default([]),
		capacity: z.number().int().min(0).default(0),
	})
	.refine((e) => e.to >= e.from, {
		path: ["to"],
		message: "Must not be earlier than `from`",
	});

/** Creates an event; responds 201 with `{ id }`. */
export async function POST(request: Request) {
	const session = await getAdminSession();
	if (!session) return jsonResponse({ error: "Unauthorized" }, 401);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return jsonResponse({ error: "Invalid JSON body" }, 400);
	}

	const parsed = createEventSchema.safeParse(body);
	if (!parsed.success) {
		return jsonResponse(
			{
				error: "Invalid request body",
				details: formatValidationErrors(parsed.error),
			},
			400,
		);
	}

	try {
		const { id } = await db.event.create({
			data: parsed.data,
			select: { id: true },
		});
		logger.info({
			event: "event.created",
			userId: session.user?.id,
			eventId: id,
		});
		return jsonResponse({ id }, 201);
	} catch (error) {
		logger.error(
			{ event: "event.create_failed", err: error },
			"Event create failed",
		);
		return jsonResponse({ error: "Internal Server Error" }, 500);
	}
}
