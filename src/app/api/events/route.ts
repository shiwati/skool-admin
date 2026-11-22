import { db } from "@/lib/db";
import { createEventSchema } from "@/lib/events/api-schema";
import { withJsonNulls } from "@/lib/events/prisma-data";
import { eventsQuerySchema, listEvents } from "@/lib/events/list";
import { handleBody, handleQuery, jsonResponse } from "@/lib/api/handler";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	return handleQuery(request, eventsQuerySchema, async (query) =>
		jsonResponse(await listEvents(query)),
	);
}

/** Creates an event; responds 201 with `{ id }`. */
export async function POST(request: Request) {
	return handleBody(
		request,
		createEventSchema,
		async (data, { userId }) => {
			const { id } = await db.event.create({
				data: withJsonNulls(data),
				select: { id: true },
			});
			logger.info({ event: "event.created", userId, eventId: id });
			return jsonResponse({ id }, 201);
		},
		{ event: "event.create_failed" },
	);
}
