import { jsonResponse } from "@/lib/api/handler";
import {
	applicantEditRequestSchema,
	toApplicantUpdate,
} from "@/lib/applicants/edit-schema";
import {
	ApplicantConflictError,
	ApplicantNotFoundError,
	updateApplicant,
} from "@/lib/applicants/update";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getAdminSession } from "@/lib/session";
import { formatValidationErrors } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/**
 * A jelentkező személyes és szülői adatainak mentése, mezőnkénti
 * History-naplóval (lásd `src/lib/applicants/update.ts`). Az `(admin)`
 * layout nem védi a Route Handlereket, ezért a session-t itt ellenőrizzük.
 */
export async function POST(request: Request, { params }: Context) {
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

	const parsed = applicantEditRequestSchema.safeParse(body);
	if (!parsed.success) {
		return jsonResponse(
			{
				error: "Invalid request body",
				details: formatValidationErrors(parsed.error),
			},
			400,
		);
	}

	const { id } = await params;
	const { expectedUpdatedAt, ...values } = parsed.data;
	try {
		const result = await updateApplicant(
			db,
			id,
			toApplicantUpdate(values),
			new Date(expectedUpdatedAt),
			userId,
		);
		logger.info({
			event: "applicant.updated",
			userId,
			changed: result.changed,
		});
		return jsonResponse({ updatedAt: result.updatedAt.toISOString() });
	} catch (error) {
		if (error instanceof ApplicantNotFoundError) {
			return jsonResponse({ error: "Not Found" }, 404);
		}
		if (error instanceof ApplicantConflictError) {
			return jsonResponse({ error: "Conflict" }, 409);
		}
		logger.error({ err: error }, "Applicant update failed");
		return jsonResponse({ error: "Internal Server Error" }, 500);
	}
}
