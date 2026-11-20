import "server-only";
import type { ApplicationStatus, PrismaClient } from "@prisma/client";
import { APPLICATION_TABLE } from "@/lib/applicants/anonymize";

export class ApplicationsNotFoundError extends Error {
	constructor() {
		super("One or more applications do not exist in this event");
		this.name = "ApplicationsNotFoundError";
	}
}

type Db = Pick<PrismaClient, "$transaction">;

/**
 * Egy tranzakcióban a megadott jelentkezések státuszát állítja be.
 * - Ismeretlen vagy más programhoz tartozó id → `ApplicationsNotFoundError`,
 *   semmi sem változik.
 * - A már a cél-státuszú jelentkezés kimarad (nem hiba, nem kap History-sort).
 * Soronként egy History-sor készül (`application` / `status`).
 */
export async function updateApplicationStatuses(
	db: Db,
	eventId: string,
	ids: readonly string[],
	status: ApplicationStatus,
	actorUserId: string,
	now: Date = new Date(),
): Promise<{ updated: number; skipped: number }> {
	const uniqueIds = [...new Set(ids)];

	return db.$transaction(async (tx) => {
		const found = await tx.application.findMany({
			where: { id: { in: uniqueIds }, eventId },
			select: { id: true, status: true },
		});
		if (found.length !== uniqueIds.length)
			throw new ApplicationsNotFoundError();

		const changing = found.filter((a) => a.status !== status);
		if (changing.length === 0) return { updated: 0, skipped: found.length };

		await tx.application.updateMany({
			where: { id: { in: changing.map((a) => a.id) }, eventId },
			data: { status, updatedById: actorUserId },
		});

		await tx.history.createMany({
			data: changing.map((a) => ({
				tableName: APPLICATION_TABLE,
				fieldName: "status",
				recordId: a.id,
				oldValue: a.status,
				newValue: status,
				createdById: actorUserId,
				createdAt: now,
			})),
		});

		return {
			updated: changing.length,
			skipped: found.length - changing.length,
		};
	});
}
