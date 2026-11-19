import { z } from "zod";
import { jsonResponse } from "@/lib/api/handler";
import {
	anonymizeApplicants,
	ApplicantsNotFoundError,
} from "@/lib/applicants/anonymize";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getAdminSession } from "@/lib/session";
import { formatValidationErrors } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Matches the list's largest page size, so "select all on page" always fits.
const MAX_DELETE_IDS = 100;

const bodySchema = z.object({
	ids: z
		.array(z.string().trim().min(1).max(64))
		.min(1)
		.max(MAX_DELETE_IDS)
		.refine((ids) => new Set(ids).size === ids.length, {
			message: "ids must be unique",
		}),
});

/**
 * GDPR-törlés: a megadott jelentkezők anonimizálása (lásd
 * `src/lib/applicants/anonymize.ts`). Az `(admin)` layout nem védi a
 * Route Handlereket, ezért a session-t itt ellenőrizzük.
 */
export async function POST(request: Request) {
	const session = await getAdminSession();
	const userId = session?.user?.id;
	if (!session || !userId)
		return jsonResponse({ error: "Unauthorized" }, 401);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return jsonResponse({ error: "Invalid request body" }, 400);
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

	try {
		const result = await anonymizeApplicants(db, parsed.data.ids, userId);
		logger.info({
			event: "applicants.anonymized",
			userId,
			count: result.deleted,
		});
		return jsonResponse(result);
	} catch (error) {
		if (error instanceof ApplicantsNotFoundError) {
			return jsonResponse({ error: "Not Found" }, 404);
		}
		logger.error({ err: error }, "Applicant anonymization failed");
		return jsonResponse({ error: "Internal Server Error" }, 500);
	}
}
