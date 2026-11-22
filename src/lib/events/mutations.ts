import "server-only";
import type { PrismaClient } from "@prisma/client";
import type { z } from "zod";
import type { updateEventSchema } from "./api-schema";
import { diffEvent, EVENT_TABLE } from "./changes";
import { withJsonNulls } from "./prisma-data";

type Db = Pick<PrismaClient, "$transaction">;

export class EventNotFoundError extends Error {}
/** A (módosított vagy tárolt) záró időpont a kezdő előtt van. */
export class EventEndBeforeStartError extends Error {}

/**
 * Hard-deletes the event; its applications cascade (applicants stay).
 * Records the deletion in `History`.
 */
export async function deleteEvent(db: Db, id: string, actorUserId: string) {
	await db.$transaction(async (tx) => {
		const current = await tx.event.findUnique({
			where: { id },
			select: { name: true },
		});
		if (!current) throw new EventNotFoundError();

		await tx.event.delete({ where: { id } });
		await tx.history.create({
			data: {
				tableName: EVENT_TABLE,
				recordId: id,
				createdById: actorUserId,
				fieldName: "deleted",
				oldValue: current.name,
				newValue: null,
			},
		});
	});
}

/**
 * Updates the sent fields (optional text fields can be cleared with `null`)
 * and records every changed field in `History`. The end is checked against
 * the stored start (and vice versa) when only one of them is sent. Returns
 * the number of changed fields; nothing is written when it is 0.
 */
export async function updateEvent(
	db: Db,
	id: string,
	patch: z.output<typeof updateEventSchema>,
	actorUserId: string,
): Promise<number> {
	return db.$transaction(async (tx) => {
		const current = await tx.event.findUnique({ where: { id } });
		if (!current) throw new EventNotFoundError();

		const from = patch.from ?? current.from;
		const to = patch.to ?? current.to;
		if (to < from) throw new EventEndBeforeStartError();

		const changes = diffEvent(current, patch);
		if (changes.length === 0) return 0;

		await tx.event.update({ where: { id }, data: withJsonNulls(patch) });
		await tx.history.createMany({
			data: changes.map((change) => ({
				tableName: EVENT_TABLE,
				recordId: id,
				createdById: actorUserId,
				...change,
			})),
		});
		return changes.length;
	});
}
