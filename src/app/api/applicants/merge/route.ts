import { z } from "zod";
import { jsonResponse } from "@/lib/api/handler";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getAdminSession } from "@/lib/session";
import { formatValidationErrors } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z
	.object({
		/** The applicant that is kept; its personal data wins. */
		primaryId: z.string().min(1),
		/** Applicants folded into the primary one, then deleted. */
		mergeIds: z.array(z.string().min(1)).min(1).max(50),
	})
	.refine((v) => new Set(v.mergeIds).size === v.mergeIds.length, {
		message: "mergeIds must be unique",
		path: ["mergeIds"],
	})
	.refine((v) => !v.mergeIds.includes(v.primaryId), {
		message: "primaryId must not be in mergeIds",
		path: ["mergeIds"],
	});

class NotFoundError extends Error {}
class NotDuplicateError extends Error {}

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
export async function POST(request: Request) {
	const session = await getAdminSession();
	const userId = session?.user?.id;
	if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return jsonResponse({ error: "Invalid JSON body" }, 400);
	}
	const parsed = bodySchema.safeParse(body);
	if (!parsed.success) {
		return jsonResponse(
			{
				error: "Invalid request body",
				details: formatValidationErrors(parsed.error),
			},
			400,
		);
	}
	const { primaryId, mergeIds } = parsed.data;
	const ids = [primaryId, ...mergeIds];

	try {
		const result = await db.$transaction(async (tx) => {
			const applicants = await tx.applicant.findMany({
				where: { id: { in: ids }, deletedAt: null },
				select: { id: true, duplicateKey: true },
			});
			if (applicants.length !== ids.length) throw new NotFoundError();
			const key = applicants[0].duplicateKey;
			if (!key || applicants.some((a) => a.duplicateKey !== key)) {
				throw new NotDuplicateError();
			}

			const moved = await tx.application.updateMany({
				where: { applicantId: { in: mergeIds } },
				data: { applicantId: primaryId, updatedById: userId },
			});
			// The merged applicants' own change history now belongs to the
			// kept one, so no History row points at a deleted applicant.
			await tx.history.updateMany({
				where: { tableName: "applicant", recordId: { in: mergeIds } },
				data: { recordId: primaryId },
			});
			await tx.history.createMany({
				data: mergeIds.map((mergedId) => ({
					tableName: "applicant",
					fieldName: "merged_from",
					oldValue: mergedId,
					newValue: primaryId,
					recordId: primaryId,
					createdById: userId,
				})),
			});
			await tx.applicant.deleteMany({ where: { id: { in: mergeIds } } });
			await tx.applicant.update({
				where: { id: primaryId },
				data: { updatedById: userId },
			});

			// The kept applicant stays flagged only while another non-deleted
			// applicant still has the same key.
			const remaining = await tx.applicant.count({
				where: { duplicateKey: key, deletedAt: null },
			});
			await tx.applicant.updateMany({
				where: { duplicateKey: key, deletedAt: null },
				data: { duplicateFlag: remaining > 1 },
			});

			return tx.applicant
				.findUniqueOrThrow({
					where: { id: primaryId },
					include: { applications: true },
				})
				.then((applicant) => ({
					applicant,
					movedApplications: moved.count,
				}));
		});

		logger.info({
			event: "applicant.merged",
			userId,
			primaryId,
			merged: mergeIds.length,
		});
		return jsonResponse(result);
	} catch (error) {
		if (error instanceof NotFoundError) {
			return jsonResponse({ error: "Applicant not found" }, 404);
		}
		if (error instanceof NotDuplicateError) {
			return jsonResponse(
				{ error: "Applicants are not duplicates" },
				409,
			);
		}
		logger.error(
			{ event: "applicant.merge_failed", userId, err: error },
			"Applicant merge failed",
		);
		return jsonResponse({ error: "Internal Server Error" }, 500);
	}
}
