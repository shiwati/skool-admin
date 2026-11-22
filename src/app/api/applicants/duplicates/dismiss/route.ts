import { z } from "zod";
import { handleBody, jsonResponse } from "@/lib/api/handler";
import { dismissDuplicatePair } from "@/lib/applicants/dismiss-duplicate";
import { duplicateErrorResponse } from "@/lib/applicants/duplicate-errors";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z
	.object({ applicantIds: z.tuple([z.string().min(1), z.string().min(1)]) })
	.refine((v) => v.applicantIds[0] !== v.applicantIds[1], {
		message: "applicantIds must differ",
		path: ["applicantIds"],
	});

/**
 * "Nem duplikáció" (lásd `src/lib/applicants/dismiss-duplicate.ts`). Az
 * `(admin)` layout nem védi a Route Handlereket; a session-t a `handleBody`
 * ellenőrzi.
 */
export async function POST(request: Request) {
	return handleBody(
		request,
		bodySchema,
		async ({ applicantIds }, { userId }) => {
			await dismissDuplicatePair(db, applicantIds, userId);
			logger.info({ event: "applicant.duplicate_dismissed", userId });
			return jsonResponse({ dismissed: true });
		},
		{
			event: "applicant.duplicate_dismiss_failed",
			mapError: duplicateErrorResponse,
		},
	);
}
