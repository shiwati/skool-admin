import "server-only";
import type { PrismaClient } from "@prisma/client";
import { recomputeDuplicateFlags } from "./duplicate-flags";
import { APPLICANT_TABLE, historyRows } from "@/lib/history/write";
import { APPLICANT_SEARCH_OMIT } from "@/lib/search-columns";

type Db = Pick<PrismaClient, "$transaction">;

/** Valamelyik jelentkező nem létezik, vagy már törölt (anonimizált). */
export class DuplicateApplicantNotFoundError extends Error {}
/** A jelentkezőknek nem ugyanaz a duplikáció-kulcsa. */
export class NotDuplicatesError extends Error {}

/**
 * Merges duplicate applicants: every application and every `applicant`
 * History row of the merged applicants moves to the primary one
 * (application data is kept as is), each merge is recorded in `History`,
 * and the merged applicants are deleted permanently. The hard delete is
 * intentional (unlike GDPR deletion, which anonymizes): they are the same
 * person, and re-imports stay matched through `Application.sourceKey`.
 * Only non-deleted applicants sharing one duplicate key can be merged.
 * `duplicateKey` stays, so a later matching applicant is flagged again.
 */
export async function mergeApplicants(
	db: Db,
	primaryId: string,
	mergeIds: readonly string[],
	actorUserId: string,
) {
	const ids = [primaryId, ...mergeIds];
	const merged = [...mergeIds];

	return db.$transaction(async (tx) => {
		const applicants = await tx.applicant.findMany({
			where: { id: { in: ids }, deletedAt: null },
			select: { id: true, duplicateKey: true },
		});
		if (applicants.length !== ids.length)
			throw new DuplicateApplicantNotFoundError();
		const key = applicants[0].duplicateKey;
		if (!key || applicants.some((a) => a.duplicateKey !== key)) {
			throw new NotDuplicatesError();
		}

		const moved = await tx.application.updateMany({
			where: { applicantId: { in: merged } },
			data: { applicantId: primaryId, updatedById: actorUserId },
		});
		// The merged applicants' own change history now belongs to the kept
		// one, so no History row points at a deleted applicant.
		await tx.history.updateMany({
			where: { tableName: APPLICANT_TABLE, recordId: { in: merged } },
			data: { recordId: primaryId },
		});
		await tx.history.createMany({
			data: historyRows(
				APPLICANT_TABLE,
				actorUserId,
				merged.map((mergedId) => ({
					recordId: primaryId,
					fieldName: "merged_from",
					oldValue: mergedId,
					newValue: primaryId,
				})),
			),
		});
		await tx.applicant.deleteMany({ where: { id: { in: merged } } });
		await tx.applicant.update({
			where: { id: primaryId },
			data: { updatedById: actorUserId },
		});

		// The kept applicant stays flagged only while another non-deleted
		// applicant still has the same key.
		await recomputeDuplicateFlags(tx, [key]);

		const applicant = await tx.applicant.findUniqueOrThrow({
			where: { id: primaryId },
			omit: APPLICANT_SEARCH_OMIT,
			include: { applications: true },
		});
		return { applicant, movedApplications: moved.count };
	});
}
