import { db } from "@/lib/db";
import { createEventSchema } from "@/lib/events/api-schema";
import { withJsonNulls } from "@/lib/events/prisma-data";
import { eventsQuerySchema, listEvents } from "@/lib/events/list";
import { handleQuery, jsonResponse } from "@/lib/api/handler";
import { logger } from "@/lib/logger";
import { getAdminSession } from "@/lib/session";
import { formatValidationErrors } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	return handleQuery(request, eventsQuerySchema, async (query) =>
		jsonResponse(await listEvents(query)),
	);
}

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
			data: withJsonNulls(parsed.data),
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
