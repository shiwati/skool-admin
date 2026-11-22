import {
	handleAdmin,
	handleBody,
	invalidField,
	jsonResponse,
} from "@/lib/api/handler";
import { db } from "@/lib/db";
import {
	END_BEFORE_START_API_MESSAGE,
	updateEventSchema,
} from "@/lib/events/api-schema";
import {
	deleteEvent,
	EventEndBeforeStartError,
	EventNotFoundError,
	updateEvent,
} from "@/lib/events/mutations";
import { getEvent } from "@/lib/events/queries";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const eventNotFound = () => jsonResponse({ error: "Event not found" }, 404);

/** Returns one event; `404` if it does not exist. */
export async function GET(
	request: Request,
	{ params }: RouteContext<"/api/events/[id]">,
) {
	return handleAdmin(
		request,
		async () => {
			const event = await getEvent((await params).id);
			return event ? jsonResponse(event) : eventNotFound();
		},
		{ event: "event.read_failed" },
	);
}

/** Hard-deletes the event (see `deleteEvent`). Responds with `{ id }`. */
export async function DELETE(
	request: Request,
	{ params }: RouteContext<"/api/events/[id]">,
) {
	return handleAdmin(
		request,
		async ({ userId }) => {
			const { id } = await params;
			await deleteEvent(db, id, userId);
			logger.info({ event: "event.deleted", userId, eventId: id });
			return jsonResponse({ id });
		},
		{ event: "event.delete_failed", mapError: eventErrorResponse },
	);
}

/** Updates the sent fields (see `updateEvent`). Responds with `{ id }`. */
export async function PATCH(
	request: Request,
	{ params }: RouteContext<"/api/events/[id]">,
) {
	return handleBody(
		request,
		updateEventSchema,
		async (patch, { userId }) => {
			const { id } = await params;
			const changed = await updateEvent(db, id, patch, userId);
			logger.info({
				event: "event.updated",
				userId,
				eventId: id,
				changed,
			});
			return jsonResponse({ id });
		},
		{ event: "event.update_failed", mapError: eventErrorResponse },
	);
}

function eventErrorResponse(error: unknown) {
	if (error instanceof EventNotFoundError) return eventNotFound();
	if (error instanceof EventEndBeforeStartError)
		return invalidField("to", END_BEFORE_START_API_MESSAGE);
}
