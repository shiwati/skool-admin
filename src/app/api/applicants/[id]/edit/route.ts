import { handleBody, jsonResponse, notFound } from "@/lib/api/handler";
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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A jelentkező személyes és szülői adatainak mentése, mezőnkénti
 * History-naplóval (lásd `src/lib/applicants/update.ts`). Az `(admin)`
 * layout nem védi a Route Handlereket; a session-t a `handleBody` ellenőrzi.
 */
export async function POST(
	request: Request,
	{ params }: RouteContext<"/api/applicants/[id]/edit">,
) {
	return handleBody(
		request,
		applicantEditRequestSchema,
		async ({ expectedUpdatedAt, ...values }, { userId }) => {
			const { id } = await params;
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
		},
		{
			event: "applicant.update_failed",
			mapError: (error) => {
				if (error instanceof ApplicantNotFoundError) return notFound();
				if (error instanceof ApplicantConflictError)
					return jsonResponse({ error: "Conflict" }, 409);
			},
		},
	);
}
