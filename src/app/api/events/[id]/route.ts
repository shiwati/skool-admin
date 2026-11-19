import { jsonResponse } from "@/lib/api/handler";
import { db } from "@/lib/db";
import {
	END_BEFORE_START_API_MESSAGE,
	updateEventSchema,
} from "@/lib/events/api-schema";
import { diffEvent, EVENT_TABLE } from "@/lib/events/changes";
import { getEvent } from "@/lib/events/queries";
import { logger } from "@/lib/logger";
import { getAdminSession } from "@/lib/session";
import { formatValidationErrors } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

class NotFoundError extends Error {}
class EndBeforeStartError extends Error {}

/** Returns one event; `404` if it does not exist. */
export async function GET(
	_request: Request,
	{ params }: RouteContext<"/api/events/[id]">,
) {
	const session = await getAdminSession();
	if (!session) return jsonResponse({ error: "Unauthorized" }, 401);

	const { id } = await params;
	try {
		const event = await getEvent(id);
		if (!event) return jsonResponse({ error: "Event not found" }, 404);
		return jsonResponse(event);
	} catch (error) {
		logger.error(
			{ event: "event.read_failed", eventId: id, err: error },
			"Event read failed",
		);
		return jsonResponse({ error: "Internal Server Error" }, 500);
	}
}

/**
 * Hard-deletes the event; its applications cascade (applicants stay).
 * Records the deletion in `History`. Responds with `{ id }`.
 */
export async function DELETE(
	_request: Request,
	{ params }: RouteContext<"/api/events/[id]">,
) {
	const session = await getAdminSession();
	const userId = session?.user?.id;
	if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);

	const { id } = await params;
	try {
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
	} catch (error) {
		if (error instanceof NotFoundError) {
			return jsonResponse({ error: "Event not found" }, 404);
		}
		logger.error(
			{ event: "event.delete_failed", userId, eventId: id, err: error },
			"Event delete failed",
		);
		return jsonResponse({ error: "Internal Server Error" }, 500);
	}
}

/**
 * Updates the sent fields (optional text fields can be cleared with `null`)
 * and records every changed field in `History`. Responds with `{ id }`.
 */
export async function PATCH(
	request: Request,
	{ params }: RouteContext<"/api/events/[id]">,
) {
	const session = await getAdminSession();
	const userId = session?.user?.id;
	if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);

	const { id } = await params;

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return jsonResponse({ error: "Invalid JSON body" }, 400);
	}
	const parsed = updateEventSchema.safeParse(body);
	if (!parsed.success) {
		return jsonResponse(
			{
				error: "Invalid request body",
				details: formatValidationErrors(parsed.error),
			},
			400,
		);
	}
	const patch = parsed.data;

	try {
		const changed = await db.$transaction(async (tx) => {
			const current = await tx.event.findUnique({ where: { id } });
			if (!current) throw new NotFoundError();

			const from = patch.from ?? current.from;
			const to = patch.to ?? current.to;
			if (to < from) throw new EndBeforeStartError();

			const changes = diffEvent(current, patch);
			if (changes.length === 0) return 0;

			await tx.event.update({ where: { id }, data: patch });
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

		logger.info({ event: "event.updated", userId, eventId: id, changed });
		return jsonResponse({ id });
	} catch (error) {
		if (error instanceof NotFoundError) {
			return jsonResponse({ error: "Event not found" }, 404);
		}
		if (error instanceof EndBeforeStartError) {
			return jsonResponse(
				{
					error: "Invalid request body",
					details: {
						formErrors: [],
						fieldErrors: { to: [END_BEFORE_START_API_MESSAGE] },
					},
				},
				400,
			);
		}
		logger.error(
			{ event: "event.update_failed", userId, eventId: id, err: error },
			"Event update failed",
		);
		return jsonResponse({ error: "Internal Server Error" }, 500);
	}
}
