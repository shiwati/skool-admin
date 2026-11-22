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
import { diffEvent, EVENT_TABLE } from "@/lib/events/changes";
import { withJsonNulls } from "@/lib/events/prisma-data";
import { getEvent } from "@/lib/events/queries";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

class NotFoundError extends Error {}
class EndBeforeStartError extends Error {}

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

/**
 * Hard-deletes the event; its applications cascade (applicants stay).
 * Records the deletion in `History`. Responds with `{ id }`.
 */
export async function DELETE(
	request: Request,
	{ params }: RouteContext<"/api/events/[id]">,
) {
	return handleAdmin(
		request,
		async ({ userId }) => {
			const { id } = await params;
			await db.$transaction(async (tx) => {
				const current = await tx.event.findUnique({
					where: { id },
					select: { name: true },
				});
				if (!current) throw new NotFoundError();

				await tx.event.delete({ where: { id } });
				await tx.history.create({
					data: {
						tableName: EVENT_TABLE,
						recordId: id,
						createdById: userId,
						fieldName: "deleted",
						oldValue: current.name,
						newValue: null,
					},
				});
			});

			logger.info({ event: "event.deleted", userId, eventId: id });
			return jsonResponse({ id });
		},
		{
			event: "event.delete_failed",
			mapError: (error) =>
				error instanceof NotFoundError ? eventNotFound() : undefined,
		},
	);
}

/**
 * Updates the sent fields (optional text fields can be cleared with `null`)
 * and records every changed field in `History`. Responds with `{ id }`.
 */
export async function PATCH(
	request: Request,
	{ params }: RouteContext<"/api/events/[id]">,
) {
	return handleBody(
		request,
		updateEventSchema,
		async (patch, { userId }) => {
			const { id } = await params;
			const changed = await db.$transaction(async (tx) => {
				const current = await tx.event.findUnique({ where: { id } });
				if (!current) throw new NotFoundError();

				const from = patch.from ?? current.from;
				const to = patch.to ?? current.to;
				if (to < from) throw new EndBeforeStartError();

				const changes = diffEvent(current, patch);
				if (changes.length === 0) return 0;

				await tx.event.update({
					where: { id },
					data: withJsonNulls(patch),
				});
				await tx.history.createMany({
					data: changes.map((change) => ({
						tableName: EVENT_TABLE,
						recordId: id,
						createdById: userId,
						...change,
					})),
				});
				return changes.length;
			});

			logger.info({
				event: "event.updated",
				userId,
				eventId: id,
				changed,
			});
			return jsonResponse({ id });
		},
		{
			event: "event.update_failed",
			mapError: (error) => {
				if (error instanceof NotFoundError) return eventNotFound();
				if (error instanceof EndBeforeStartError)
					return invalidField("to", END_BEFORE_START_API_MESSAGE);
			},
		},
	);
}
