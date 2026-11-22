import { z } from "zod";
import { handleBody, jsonResponse, notFound } from "@/lib/api/handler";
import { idListSchema } from "@/lib/api/query";
import {
	anonymizeApplicants,
	ApplicantsNotFoundError,
} from "@/lib/applicants/anonymize";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ ids: idListSchema });

/**
 * GDPR-törlés: a megadott jelentkezők anonimizálása (lásd
 * `src/lib/applicants/anonymize.ts`). Az `(admin)` layout nem védi a
 * Route Handlereket; a session-t a `handleBody` ellenőrzi.
 */
export async function POST(request: Request) {
	return handleBody(
		request,
		bodySchema,
		async ({ ids }, { userId }) => {
			const result = await anonymizeApplicants(db, ids, userId);
			logger.info({
				event: "applicants.anonymized",
				userId,
				count: result.deleted,
			});
			return jsonResponse(result);
		},
		{
			event: "applicants.anonymize_failed",
			mapError: (error) =>
				error instanceof ApplicantsNotFoundError
					? notFound()
					: undefined,
		},
	);
}
