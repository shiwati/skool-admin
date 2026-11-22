import { z } from "zod";
import { handleBody, jsonResponse } from "@/lib/api/handler";
import { duplicateErrorResponse } from "@/lib/applicants/duplicate-errors";
import { mergeApplicants } from "@/lib/applicants/merge";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

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

/**
 * Duplikált jelentkezők összevonása (lásd `src/lib/applicants/merge.ts`).
 * Az `(admin)` layout nem védi a Route Handlereket; a session-t a
 * `handleBody` ellenőrzi.
 */
export async function POST(request: Request) {
	return handleBody(
		request,
		bodySchema,
		async ({ primaryId, mergeIds }, { userId }) => {
			const result = await mergeApplicants(
				db,
				primaryId,
				mergeIds,
				userId,
			);
			logger.info({
				event: "applicant.merged",
				userId,
				primaryId,
				merged: mergeIds.length,
			});
			return jsonResponse(result);
		},
		{
			event: "applicant.merge_failed",
			mapError: duplicateErrorResponse,
		},
	);
}
